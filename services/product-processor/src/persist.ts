import { errorMessage, isTransientDbError } from './errors.js';
import { slugify } from './pool.js';
import type { ProductGeneration } from './schemas.js';
import type { ProcessorSupabase } from './supabase.js';
import type { CoverageResult } from './validate.js';
import type { RawProductRow } from './generate.js';

export interface WebsiteCollection {
  id: string;
  name: string;
  slug: string;
}

async function uniqueSlug(supabase: ProcessorSupabase, desired: string, excludeId?: string | null): Promise<string> {
  const base = slugify(desired) || `product-${Date.now()}`;
  let candidate = base;
  let suffix = 2;

  while (true) {
    const { data, error } = await supabase.from('products').select('id').eq('slug', candidate).limit(1);
    if (error) {
      throw new Error(`Could not check product slug: ${error.message}`);
    }
    const existingId = data?.[0]?.id;
    if (!existingId || existingId === excludeId) {
      return candidate;
    }
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function replaceChildren(
  supabase: ProcessorSupabase,
  productId: string,
  generated: ProductGeneration,
  collection: WebsiteCollection,
  sourcePrice: number | null,
  compareAt: number | null,
) {
  const deletes = await Promise.all([
    supabase.from('product_collections').delete().eq('product_id', productId),
    supabase.from('product_qualities').delete().eq('product_id', productId),
    supabase.from('product_specs').delete().eq('product_id', productId),
    supabase.from('product_features').delete().eq('product_id', productId),
    supabase.from('product_faqs').delete().eq('product_id', productId),
    supabase.from('product_reviews').delete().eq('product_id', productId),
  ]);
  const deleteError = deletes.find((result) => result.error)?.error?.message;
  if (deleteError) {
    throw new Error(deleteError);
  }

  const inserts = await Promise.all([
    supabase.from('product_collections').insert({
      product_id: productId,
      collection_id: collection.id,
      position: 0,
    }),
    supabase.from('product_qualities').insert({
      product_id: productId,
      quality: 'Top 1:1 Clone',
      price: sourcePrice,
      compare_at_price: compareAt,
    }),
    generated.product.specifications.length
      ? supabase.from('product_specs').insert(
          generated.product.specifications.map((spec, position) => ({
            product_id: productId,
            label: spec.label.slice(0, 120),
            value: spec.value.slice(0, 500),
            position,
          })),
        )
      : Promise.resolve({ error: null }),
    generated.product.features.length
      ? supabase.from('product_features').insert(
          generated.product.features.map((feature, position) => ({
            product_id: productId,
            feature_text: feature.feature_text.slice(0, 400),
            position,
          })),
        )
      : Promise.resolve({ error: null }),
    generated.product.faqs.length
      ? supabase.from('product_faqs').insert(
          generated.product.faqs.map((faq, position) => ({
            product_id: productId,
            question: faq.question.slice(0, 300),
            answer: faq.answer.slice(0, 2000),
            position,
          })),
        )
      : Promise.resolve({ error: null }),
    generated.product.reviews.length
      ? supabase.from('product_reviews').insert(
          generated.product.reviews.map((review, position) => ({
            product_id: productId,
            title: review.title.slice(0, 180),
            rating: review.rating,
            customer_name: review.customer_name.slice(0, 120),
            review_date: review.review_date,
            review_text: review.review_text.slice(0, 2000),
            status: 'published' as const,
            position,
          })),
        )
      : Promise.resolve({ error: null }),
  ]);

  const insertError = inserts.find((result) => result.error)?.error?.message;
  if (insertError) {
    throw new Error(insertError);
  }
}

export async function replaceProductSpecs(
  supabase: ProcessorSupabase,
  productId: string,
  specifications: Array<{ label: string; value: string }>,
): Promise<void> {
  const { error: deleteError } = await supabase.from('product_specs').delete().eq('product_id', productId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (specifications.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from('product_specs').insert(
    specifications.map((spec, position) => ({
      product_id: productId,
      label: spec.label.slice(0, 120),
      value: spec.value.slice(0, 500),
      position,
    })),
  );
  if (insertError) {
    throw new Error(insertError.message);
  }
}

export async function saveDraftProduct(options: {
  supabase: ProcessorSupabase;
  raw: RawProductRow;
  generated: ProductGeneration;
  coverage: CoverageResult;
  collection: WebsiteCollection;
}): Promise<string> {
  const { supabase, raw, generated, collection } = options;
  const sourcePrice = generated.product.price;
  const compareAt = generated.product.compare_at_price;

  let productId = raw.processed_product_id;
  if (productId) {
    const { data: existing, error } = await supabase
      .from('products')
      .select('id, status, slug')
      .eq('id', productId)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    if (!existing) {
      productId = null;
    } else if (existing.status === 'published') {
      throw new Error('This raw product already maps to a published catalog product. Edit it in the product editor instead of reprocessing.');
    }
  }

  const slug = await uniqueSlug(supabase, generated.product.slug || generated.product.title, productId);
  const fields = {
    title: generated.product.title.slice(0, 180),
    slug,
    short_description: generated.product.short_description,
    about_heading: generated.product.about_heading,
    description: generated.product.description,
    meta_title: generated.product.meta_title.slice(0, 70) || generated.product.title.slice(0, 70),
    meta_description: generated.product.meta_description.slice(0, 320),
    primary_collection_id: collection.id,
    featured: false,
    best_seller: false,
    status: 'draft' as const,
    published_at: null,
  };

  let savedId = productId;
  if (savedId) {
    const { error } = await supabase.from('products').update(fields).eq('id', savedId);
    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { data, error } = await supabase.from('products').insert(fields).select('id').single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Could not create the draft product.');
    }
    savedId = data.id;
  }

  if (!savedId) {
    throw new Error('Could not create the draft product.');
  }

  await replaceChildren(supabase, savedId, generated, collection, sourcePrice, compareAt);

  const { error: rawError } = await supabase
    .from('raw_products')
    .update({
      processed_product_id: savedId,
      scrape_status: 'processed',
    })
    .eq('id', raw.id);
  if (rawError) {
    throw new Error(rawError.message);
  }

  return savedId;
}

async function withDbRetry<T>(label: string, operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || attempt === 4) {
        throw error;
      }
      const delayMs = 500 * attempt;
      console.warn(`[ai] ${label} failed (${errorMessage(error)}); retry ${attempt}/3 in ${delayMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

export async function refreshJobCounts(supabase: ProcessorSupabase, jobId: string) {
  await withDbRetry('refreshJobCounts', async () => {
    const { data, error } = await supabase
      .from('ai_product_runs')
      .select('status')
      .eq('processing_job_id', jobId);
    if (error) {
      throw new Error(error.message);
    }

    const rows = data ?? [];
    const processed = rows.filter((row) => row.status === 'completed').length;
    const failed = rows.filter((row) => row.status === 'failed').length;
    const { error: updateError } = await supabase
      .from('ai_processing_jobs')
      .update({
        processed_products: processed,
        failed_products: failed,
      })
      .eq('id', jobId);
    if (updateError) {
      throw new Error(updateError.message);
    }
  });
}
