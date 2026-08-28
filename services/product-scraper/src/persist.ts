import type { NormalizedProduct, ScrapeJobStatus, ScrapeStatus } from './schemas.js';
import type { ScraperSupabase } from './supabase.js';

export interface RawProductRow {
  id: string;
  scrape_status: ScrapeStatus;
}

export interface ScrapeJobRow {
  id: string;
  source_collection_url: string;
  source_collection_name: string | null;
  source_domain: string | null;
  products_discovered: number;
  products_completed: number;
  products_failed: number;
  job_status: ScrapeJobStatus;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface CollectionContext {
  jobId: string;
  collectionUrl: string;
  collectionName?: string | null;
}

export async function createScrapeJob(
  supabase: ScraperSupabase,
  input: {
    collectionUrl: string;
    collectionName?: string | null;
    sourceDomain: string;
  },
): Promise<ScrapeJobRow> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('scrape_jobs')
    .insert({
      source_collection_url: input.collectionUrl,
      source_collection_name: input.collectionName ?? null,
      source_domain: input.sourceDomain,
      job_status: 'running',
      started_at: now,
    })
    .select(
      'id, source_collection_url, source_collection_name, source_domain, products_discovered, products_completed, products_failed, job_status, error_message, started_at, completed_at',
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create the scrape job.');
  }

  return data as ScrapeJobRow;
}

export async function getScrapeJob(supabase: ScraperSupabase, jobId: string): Promise<ScrapeJobRow | null> {
  const { data, error } = await supabase
    .from('scrape_jobs')
    .select(
      'id, source_collection_url, source_collection_name, source_domain, products_discovered, products_completed, products_failed, job_status, error_message, started_at, completed_at',
    )
    .eq('id', jobId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ScrapeJobRow | null) ?? null;
}

export async function updateScrapeJob(
  supabase: ScraperSupabase,
  jobId: string,
  patch: Partial<{
    source_collection_name: string | null;
    products_discovered: number;
    products_completed: number;
    products_failed: number;
    job_status: ScrapeJobStatus;
    error_message: string | null;
    completed_at: string | null;
  }>,
): Promise<void> {
  const { error } = await supabase.from('scrape_jobs').update(patch).eq('id', jobId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function refreshJobCounts(supabase: ScraperSupabase, jobId: string): Promise<void> {
  const { data, error } = await supabase.from('raw_products').select('scrape_status').eq('scrape_job_id', jobId);

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const products_completed = rows.filter((row) => row.scrape_status === 'scraped' || row.scrape_status === 'processed').length;
  const products_failed = rows.filter((row) => row.scrape_status === 'failed').length;

  const { error: updateError } = await supabase
    .from('scrape_jobs')
    .update({ products_completed, products_failed })
    .eq('id', jobId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export async function listJobProductUrls(
  supabase: ScraperSupabase,
  jobId: string,
  status?: ScrapeStatus,
): Promise<string[]> {
  let query = supabase.from('raw_products').select('source_url').eq('scrape_job_id', jobId);
  if (status) {
    query = query.eq('scrape_status', status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => row.source_url).filter(Boolean);
}

export async function upsertRawProduct(
  supabase: ScraperSupabase,
  input: {
    product?: NormalizedProduct;
    sourceUrl: string;
    sourceDomain: string;
    status: ScrapeStatus;
    errorMessage?: string | null;
    collection?: CollectionContext;
  },
): Promise<RawProductRow> {
  const now = new Date().toISOString();
  const product = input.product;
  const collection = input.collection;

  const payload: Record<string, unknown> = {
    source_url: product?.source_url ?? input.sourceUrl,
    source_domain: product?.source_domain ?? input.sourceDomain,
    scrape_status: input.status,
    error_message: input.errorMessage ?? null,
    scraped_at: now,
  };

  if (collection) {
    payload.scrape_job_id = collection.jobId;
    payload.source_collection_url = product?.collection_url ?? collection.collectionUrl;
    payload.source_collection_name = product?.collection_name ?? collection.collectionName ?? null;
  }

  if (product) {
    payload.source_title = product.title;
    payload.source_description = product.description;
    payload.source_price = product.price;
    payload.source_currency = product.currency;
    payload.source_breadcrumbs = product.breadcrumbs;
    payload.source_specifications = product.specifications;
    payload.source_features = product.features;
    payload.source_collection_url = product.collection_url ?? collection?.collectionUrl ?? null;
    payload.source_collection_name = product.collection_name ?? collection?.collectionName ?? null;
    payload.source_model = product.model;
    payload.source_brand = product.brand;
    payload.source_category = product.category;
    payload.source_primary_specs = product.primary_specs;
    payload.source_additional_information = product.additional_information;
    payload.raw_data = product.raw_data;
  }

  const { data, error } = await supabase
    .from('raw_products')
    .upsert(payload, { onConflict: 'source_url' })
    .select('id, scrape_status')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to save the scraped product.');
  }

  return data as RawProductRow;
}
