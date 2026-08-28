import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '../../types/database';
import { PRODUCT_IMAGE_BUCKET, type ContentStatus } from './constants';
import {
  formBoolean,
  formOptional,
  formStatus,
  formString,
  formStringList,
  parseIntegerInRange,
  parseNonNegativeInteger,
  parseNonNegativeNumber,
  uniqueConstraintMessage,
} from './forms';
import { isUuid, sanitizeSearch } from './query';
import { isValidSlug, slugify } from './slug';
import { isContentStatus, publishedAtForStatus } from './status';
import { removeAdminImage, uploadAdminImage } from './storage';
import { requestStorefrontRebuild } from '../rebuild';
import {
  BEST_SELLERS_SLUG,
  collections,
  isModelCollectionSlug,
  MODEL_COLLECTION_SLUGS,
  unlistedModelCollections,
} from '../../data/collections';
import {
  DEFAULT_QUALITY,
  hasCompleteQualityPrices,
  type ProductQualityName,
} from '../qualities';

export type ProductRecord = Tables<'products'>;
export type ProductImageRecord = Tables<'product_images'>;
export type ProductQualityRecord = Tables<'product_qualities'>;
export type ProductSpecRecord = Tables<'product_specs'>;
export type ProductFaqRecord = Tables<'product_faqs'>;
export type ProductFeatureRecord = Tables<'product_features'>;
export type ProductReviewRecord = Tables<'product_reviews'>;

export interface ProductListItem extends ProductRecord {
  primary_collection_name: string | null;
  image_path: string | null;
}

export interface ProductImageInput {
  id: string | null;
  storagePath: string | null;
  alt: string;
  position: number;
  isPrimary: boolean;
  file: File | null;
}

export interface ProductQualityInput {
  quality: ProductQualityName;
  price: number | null;
  compareAtPrice: number | null;
}

export interface ProductSpecInput {
  id: string | null;
  label: string;
  value: string;
  position: number;
}

export interface ProductFaqInput {
  id: string | null;
  question: string;
  answer: string;
  position: number;
}

export interface ProductFeatureInput {
  id: string | null;
  featureText: string;
  position: number;
}

export interface ProductReviewInput {
  id: string | null;
  title: string;
  rating: number;
  customerName: string;
  reviewDate: string;
  reviewText: string;
  status: ContentStatus;
  position: number;
}

export interface ProductInput {
  title: string;
  slug: string;
  sku: string | null;
  collectionIds: string[];
  shortDescription: string | null;
  description: string | null;
  aboutHeading: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  featured: boolean;
  bestSeller: boolean;
  status: ContentStatus;
  images: ProductImageInput[];
  qualities: ProductQualityInput[];
  specs: ProductSpecInput[];
  features: ProductFeatureInput[];
  reviews: ProductReviewInput[];
  faqs: ProductFaqInput[];
}

export interface ProductEditorData {
  product: ProductRecord;
  images: ProductImageRecord[];
  qualities: ProductQualityRecord[];
  specs: ProductSpecRecord[];
  features: ProductFeatureRecord[];
  reviews: ProductReviewRecord[];
  faqs: ProductFaqRecord[];
  collectionIds: string[];
}

function fileFromForm(form: FormData, name: string): File | null {
  const value = form.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}

export async function listProducts(
  supabase: SupabaseClient<Database>,
  filters: { q?: string; status?: string; collectionId?: string },
): Promise<{ data: ProductListItem[]; error: string | null }> {
  let query = supabase
    .from('products')
    .select(
      '*, collections:primary_collection_id(name), product_images(storage_path, is_primary, position)',
    )
    .order('updated_at', { ascending: false });

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status as ContentStatus);
  }

  const search = sanitizeSearch(filters.q);
  if (search) {
    query = query.or(`title.ilike.%${search}%,sku.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  if (filters.collectionId && isUuid(filters.collectionId)) {
    const { data: joins, error: joinError } = await supabase
      .from('product_collections')
      .select('product_id')
      .eq('collection_id', filters.collectionId);

    if (joinError) {
      return { data: [], error: joinError.message };
    }

    const ids = [...new Set((joins ?? []).map((row) => row.product_id))];
    if (ids.length === 0) {
      return { data: [], error: null };
    }

    query = query.in('id', ids);
  }

  const { data, error } = await query;
  if (error) {
    return { data: [], error: error.message };
  }

  const items = (data ?? []).map((row) => {
    const {
      collections,
      product_images,
      ...product
    } = row as ProductRecord & {
      collections: { name: string } | null;
      product_images: { storage_path: string; is_primary: boolean; position: number }[] | null;
    };

    const images = [...(product_images ?? [])].sort((a, b) => {
      if (a.is_primary !== b.is_primary) {
        return a.is_primary ? -1 : 1;
      }

      return a.position - b.position;
    });

    return {
      ...product,
      primary_collection_name: collections?.name ?? null,
      image_path: images[0]?.storage_path ?? null,
    };
  });

  return { data: items, error: null };
}

export async function getProductEditorData(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<{ data: ProductEditorData | null; error: string | null }> {
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  if (!product) {
    return { data: null, error: null };
  }

  const [images, qualities, specs, features, reviews, faqs, collections] = await Promise.all([
    supabase.from('product_images').select('*').eq('product_id', id).order('position'),
    supabase.from('product_qualities').select('*').eq('product_id', id),
    supabase.from('product_specs').select('*').eq('product_id', id).order('position'),
    supabase.from('product_features').select('*').eq('product_id', id).order('position'),
    supabase.from('product_reviews').select('*').eq('product_id', id).order('position'),
    supabase.from('product_faqs').select('*').eq('product_id', id).order('position'),
    supabase.from('product_collections').select('collection_id').eq('product_id', id).order('position'),
  ]);

  const childError =
    images.error?.message ||
    qualities.error?.message ||
    specs.error?.message ||
    features.error?.message ||
    reviews.error?.message ||
    faqs.error?.message ||
    collections.error?.message;

  if (childError) {
    return { data: null, error: childError };
  }

  return {
    data: {
      product,
      images: images.data ?? [],
      qualities: qualities.data ?? [],
      specs: specs.data ?? [],
      features: features.data ?? [],
      reviews: reviews.data ?? [],
      faqs: faqs.data ?? [],
      collectionIds: (collections.data ?? []).map((row) => row.collection_id),
    },
    error: null,
  };
}

function formQualityField(form: FormData, kind: 'price' | 'compare'): string {
  const named =
    kind === 'price'
      ? formString(form, 'quality_price') || formString(form, 'quality_prices')
      : formString(form, 'quality_compare') || formString(form, 'quality_compares');
  if (named) {
    return named;
  }

  const ordered = formStringList(form, kind === 'price' ? 'quality_prices' : 'quality_compares');
  return (ordered[0] ?? '').trim();
}

export function parseProductForm(form: FormData): ProductInput | { error: string; values?: ProductInput } {
  const title = formString(form, 'title');
  if (!title) {
    return { error: 'Title is required.' };
  }

  const slugValue = formString(form, 'slug') || slugify(title);
  if (!isValidSlug(slugValue)) {
    return { error: 'Slug must use lowercase letters, numbers, and hyphens.' };
  }

  const collectionIds = [...new Set(formStringList(form, 'collection_ids').filter((id) => isUuid(id)))];
  if (collectionIds.length === 0) {
    return { error: 'Select at least one collection.' };
  }

  const imageIds = formStringList(form, 'image_ids');
  const imagePaths = formStringList(form, 'image_paths');
  const imageAlts = formStringList(form, 'image_alts');
  const imagePositions = formStringList(form, 'image_positions');
  const primaryImage = formString(form, 'primary_image');
  const primaryImageIndex = primaryImage === '' ? -1 : Number(primaryImage);

  const images: ProductImageInput[] = [];
  for (let index = 0; index < imageIds.length; index += 1) {
    const file = fileFromForm(form, `image_file_${index}`);
    const storagePath = (imagePaths[index] ?? '').trim() || null;
    const alt = (imageAlts[index] ?? '').trim();
    const positionValue = parseNonNegativeInteger(imagePositions[index] ?? String(index), 'Image position');
    if (typeof positionValue === 'object') {
      return positionValue;
    }

    if (!alt) {
      return { error: 'Alt text is required for every product image.' };
    }

    if (!storagePath && !file) {
      return { error: 'Each product image needs an uploaded file.' };
    }

    images.push({
      id: imageIds[index]?.trim() || null,
      storagePath,
      alt,
      position: positionValue,
      isPrimary: index === primaryImageIndex,
      file,
    });
  }

  if (images.length === 1) {
    images[0].isPrimary = true;
  }

  if (images.length > 1) {
    const primaryCount = images.filter((image) => image.isPrimary).length;
    if (primaryCount !== 1) {
      return { error: 'Choose exactly one primary product image.' };
    }
  }

  const priceRaw = formQualityField(form, 'price');
  const compareRaw = formQualityField(form, 'compare');

  let price: number | null = null;
  if (priceRaw) {
    const parsed = parseNonNegativeNumber(priceRaw, 'Price');
    if (typeof parsed === 'object') {
      return parsed;
    }
    price = parsed;
  }

  let compareAtPrice: number | null = null;
  if (compareRaw) {
    const parsed = parseNonNegativeNumber(compareRaw, 'Compare-at price');
    if (typeof parsed === 'object') {
      return parsed;
    }
    compareAtPrice = parsed;
  }

  const qualities: ProductQualityInput[] = [{ quality: DEFAULT_QUALITY, price, compareAtPrice }];

  const specLabels = formStringList(form, 'spec_labels');
  const specValues = formStringList(form, 'spec_values');
  const specs: ProductSpecInput[] = [];

  for (let index = 0; index < specLabels.length; index += 1) {
    const label = (specLabels[index] ?? '').trim();
    const value = (specValues[index] ?? '').trim();
    if (!label && !value) {
      continue;
    }

    if (!label || !value) {
      return { error: 'Each specification needs a label and a value.' };
    }

    specs.push({ label, value, position: specs.length, id: null });
  }

  const featureTexts = formStringList(form, 'feature_texts');
  const features: ProductFeatureInput[] = [];

  for (let index = 0; index < featureTexts.length; index += 1) {
    const featureText = (featureTexts[index] ?? '').trim();
    if (!featureText) {
      continue;
    }

    features.push({ featureText, position: features.length, id: null });
  }

  const reviewTitles = formStringList(form, 'review_titles');
  const reviewRatings = formStringList(form, 'review_ratings');
  const reviewNames = formStringList(form, 'review_customer_names');
  const reviewDates = formStringList(form, 'review_dates');
  const reviewTexts = formStringList(form, 'review_texts');
  const reviewStatuses = formStringList(form, 'review_statuses');
  const reviews: ProductReviewInput[] = [];

  for (let index = 0; index < reviewTitles.length; index += 1) {
    const titleValue = (reviewTitles[index] ?? '').trim();
    const ratingRaw = (reviewRatings[index] ?? '').trim();
    const customerName = (reviewNames[index] ?? '').trim();
    const reviewDate = (reviewDates[index] ?? '').trim();
    const reviewText = (reviewTexts[index] ?? '').trim();
    const reviewStatus = (reviewStatuses[index] ?? '').trim();

    if (!titleValue && !customerName && !reviewDate && !reviewText) {
      continue;
    }

    if (!titleValue || !customerName || !reviewDate || !reviewText) {
      return { error: 'Each review needs a title, customer name, date, and review text.' };
    }

    const rating = parseIntegerInRange(ratingRaw, 'Review rating', 1, 5);
    if (typeof rating === 'object') {
      return rating;
    }

    reviews.push({
      id: null,
      title: titleValue,
      rating,
      customerName,
      reviewDate,
      reviewText,
      status: isContentStatus(reviewStatus) ? reviewStatus : 'published',
      position: reviews.length,
    });
  }

  const faqQuestions = formStringList(form, 'faq_questions');
  const faqAnswers = formStringList(form, 'faq_answers');
  const faqs: ProductFaqInput[] = [];

  for (let index = 0; index < faqQuestions.length; index += 1) {
    const question = (faqQuestions[index] ?? '').trim();
    const answer = (faqAnswers[index] ?? '').trim();
    if (!question && !answer) {
      continue;
    }

    if (!question || !answer) {
      return { error: 'Each FAQ needs a question and an answer.' };
    }

    faqs.push({ question, answer, position: faqs.length, id: null });
  }

  const status = formStatus(form);
  const parsed: ProductInput = {
    title,
    slug: slugValue,
    sku: formOptional(form, 'sku'),
    collectionIds,
    shortDescription: formOptional(form, 'short_description'),
    description: formOptional(form, 'description'),
    aboutHeading: formOptional(form, 'about_heading'),
    metaTitle: formOptional(form, 'meta_title'),
    metaDescription: formOptional(form, 'meta_description'),
    canonicalUrl: formOptional(form, 'canonical_url'),
    featured: formBoolean(form, 'featured'),
    bestSeller: false,
    status,
    images,
    qualities,
    specs,
    features,
    reviews,
    faqs,
  };

  if (status === 'published' && !hasCompleteQualityPrices(qualities)) {
    return { error: 'Set a Top 1:1 Clone price before publishing.', values: parsed };
  }

  if (status === 'published' && images.length === 0) {
    return { error: 'Add a product image before publishing.', values: parsed };
  }

  if (status === 'published' && collectionIds.length === 0) {
    return { error: 'Assign a collection before publishing.', values: parsed };
  }

  return parsed;
}

async function syncProductCollections(
  supabase: SupabaseClient<Database>,
  productId: string,
  collectionIds: string[] | null | undefined,
): Promise<string | null> {
  const uniqueIds = [...new Set(collectionIds ?? [])];

  if (uniqueIds.length === 0) {
    const { error: deleteError } = await supabase
      .from('product_collections')
      .delete()
      .eq('product_id', productId);
    return deleteError?.message ?? null;
  }

  const { error: upsertError } = await supabase.from('product_collections').upsert(
    uniqueIds.map((collectionId, position) => ({
      product_id: productId,
      collection_id: collectionId,
      position,
    })),
    { onConflict: 'product_id,collection_id' },
  );

  if (upsertError) {
    return upsertError.message;
  }

  const { error: deleteError } = await supabase
    .from('product_collections')
    .delete()
    .eq('product_id', productId)
    .not('collection_id', 'in', `(${uniqueIds.join(',')})`);

  return deleteError?.message ?? null;
}

async function resolveCollectionMembership(
  supabase: SupabaseClient<Database>,
  collectionIds: string[] | null | undefined,
): Promise<{ primaryCollectionId: string | null; bestSeller: boolean } | { error: string }> {
  const uniqueIds = [...new Set(collectionIds ?? [])];
  if (uniqueIds.length === 0) {
    return { error: 'Select at least one collection.' };
  }
  const { data, error } = await supabase
    .from('collections')
    .select('id, slug')
    .in('id', uniqueIds);

  if (error) {
    return { error: error.message };
  }

  const rows = data ?? [];
  if (rows.length !== uniqueIds.length) {
    return { error: 'Choose valid collections.' };
  }

  const hasModelCollection = rows.some((row) => isModelCollectionSlug(row.slug));
  if (!hasModelCollection) {
    const modelNames = [...collections, ...unlistedModelCollections].map((collection) => collection.name).join(', ');
    return {
      error: `Select at least one model collection (${modelNames}).`,
    };
  }

  const primary = MODEL_COLLECTION_SLUGS.map((slug) => rows.find((row) => row.slug === slug)).find(Boolean);

  return {
    primaryCollectionId: primary?.id ?? null,
    bestSeller: rows.some((row) => row.slug === BEST_SELLERS_SLUG),
  };
}

async function syncProductImages(
  supabase: SupabaseClient<Database>,
  productId: string,
  images: ProductImageInput[] | null | undefined,
  existing: ProductImageRecord[] | null | undefined,
): Promise<string | null> {
  const nextImages = images ?? [];
  const nextExisting = existing ?? [];
  const keptIds = new Set(nextImages.map((image) => image.id).filter((id): id is string => Boolean(id)));
  const removed = nextExisting.filter((image) => !keptIds.has(image.id));

  for (const image of removed) {
    const { error } = await supabase.from('product_images').delete().eq('id', image.id);
    if (error) {
      return error.message;
    }

    await removeAdminImage(supabase, PRODUCT_IMAGE_BUCKET, image.storage_path);
  }

  if (nextImages.length > 0) {
    const { error: clearError } = await supabase
      .from('product_images')
      .update({ is_primary: false })
      .eq('product_id', productId);

    if (clearError) {
      return clearError.message;
    }
  }

  for (const image of nextImages) {
    let storagePath = image.storagePath;

    if (image.file) {
      const uploaded = await uploadAdminImage(
        supabase,
        PRODUCT_IMAGE_BUCKET,
        image.file,
        productId,
      );
      if ('error' in uploaded) {
        return uploaded.error;
      }

      if (storagePath && storagePath !== uploaded.path) {
        await removeAdminImage(supabase, PRODUCT_IMAGE_BUCKET, storagePath);
      }

      storagePath = uploaded.path;
    }

    if (!storagePath) {
      return 'A product image is missing its storage path.';
    }

    if (image.id) {
      const { error } = await supabase
        .from('product_images')
        .update({
          storage_path: storagePath,
          alt_text: image.alt,
          position: image.position,
          is_primary: image.isPrimary,
        })
        .eq('id', image.id);

      if (error) {
        return error.message;
      }
    } else {
      const { error } = await supabase.from('product_images').insert({
        product_id: productId,
        storage_path: storagePath,
        alt_text: image.alt,
        position: image.position,
        is_primary: image.isPrimary,
      });

      if (error) {
        return error.message;
      }
    }
  }

  return null;
}

async function replaceChildren<T extends Record<string, unknown>>(
  supabase: SupabaseClient<Database>,
  table: 'product_qualities' | 'product_specs' | 'product_features' | 'product_reviews' | 'product_faqs',
  productId: string,
  rows: T[] | null | undefined,
): Promise<string | null> {
  const nextRows = rows ?? [];
  const { error: deleteError } = await supabase.from(table).delete().eq('product_id', productId);
  if (deleteError) {
    return deleteError.message;
  }

  if (nextRows.length === 0) {
    return null;
  }

  const { error } = await supabase.from(table).insert(nextRows);
  return error?.message ?? null;
}

export async function saveProduct(
  supabase: SupabaseClient<Database>,
  input: ProductInput,
  options: { id?: string; current?: ProductRecord | null; existingImages?: ProductImageRecord[] } = {},
): Promise<{ id?: string; error?: string }> {
  const current = options.current ?? null;
  const existingImages = options.existingImages ?? [];
  const collectionIds = input.collectionIds ?? [];
  const images = input.images ?? [];
  const qualities = input.qualities ?? [];
  const specs = input.specs ?? [];
  const features = input.features ?? [];
  const reviews = input.reviews ?? [];
  const faqs = input.faqs ?? [];

  const membership = await resolveCollectionMembership(supabase, collectionIds);
  if ('error' in membership) {
    return { error: membership.error };
  }

  const payload = {
    title: input.title,
    slug: input.slug,
    sku: input.sku ?? null,
    primary_collection_id: membership.primaryCollectionId,
    short_description: input.shortDescription ?? null,
    description: input.description ?? null,
    about_heading: input.aboutHeading ?? null,
    meta_title: input.metaTitle ?? null,
    meta_description: input.metaDescription ?? null,
    canonical_url: input.canonicalUrl ?? null,
    featured: input.featured ?? false,
    best_seller: membership.bestSeller,
    status: input.status,
    published_at: publishedAtForStatus(input.status, current?.published_at),
  };

  let productId = options.id;

  console.info(
    '[iwc-product-save]',
    JSON.stringify({
      productId: productId ?? null,
      status: input.status,
      publishedAt: payload.published_at,
      qualities: qualities.map((quality) => ({
        quality: quality.quality,
        price: quality.price,
        compareAtPrice: quality.compareAtPrice,
      })),
    }),
  );

  if (productId) {
    const { error } = await supabase.from('products').update(payload).eq('id', productId);
    if (error) {
      return { error: uniqueConstraintMessage(error, 'slug') ?? error.message };
    }
  } else {
    const { data, error } = await supabase.from('products').insert(payload).select('id').single();
    if (error || !data) {
      return { error: uniqueConstraintMessage(error ?? {}, 'slug') ?? 'Could not create the product.' };
    }

    productId = data.id;
  }

  const collectionError = await syncProductCollections(supabase, productId, collectionIds);
  if (collectionError) {
    return { id: productId, error: collectionError };
  }

  const imageError = await syncProductImages(supabase, productId, images, existingImages);
  if (imageError) {
    return { id: productId, error: imageError };
  }

  const qualityError = await replaceChildren(
    supabase,
    'product_qualities',
    productId,
    qualities.map((quality) => ({
      product_id: productId,
      quality: quality.quality,
      price: quality.price,
      compare_at_price: quality.compareAtPrice,
    })),
  );
  if (qualityError) {
    return { id: productId, error: qualityError };
  }

  const specError = await replaceChildren(
    supabase,
    'product_specs',
    productId,
    specs.map((spec) => ({
      product_id: productId,
      label: spec.label,
      value: spec.value,
      position: spec.position,
    })),
  );
  if (specError) {
    return { id: productId, error: specError };
  }

  const featureError = await replaceChildren(
    supabase,
    'product_features',
    productId,
    features.map((feature) => ({
      product_id: productId,
      feature_text: feature.featureText,
      position: feature.position,
    })),
  );
  if (featureError) {
    return { id: productId, error: featureError };
  }

  const reviewError = await replaceChildren(
    supabase,
    'product_reviews',
    productId,
    reviews.map((review) => ({
      product_id: productId,
      title: review.title,
      rating: review.rating,
      customer_name: review.customerName,
      review_date: review.reviewDate,
      review_text: review.reviewText,
      status: review.status,
      position: review.position,
    })),
  );
  if (reviewError) {
    return { id: productId, error: reviewError };
  }

  const faqError = await replaceChildren(
    supabase,
    'product_faqs',
    productId,
    faqs.map((faq) => ({
      product_id: productId,
      question: faq.question,
      answer: faq.answer,
      position: faq.position,
    })),
  );
  if (faqError) {
    return { id: productId, error: faqError };
  }

  const affectsStorefront = input.status === 'published' || current?.status === 'published';
  if (affectsStorefront) {
    await requestStorefrontRebuild();
  }

  return { id: productId };
}

export async function deleteProduct(
  supabase: SupabaseClient<Database>,
  productId: string,
): Promise<string | null> {
  const { data: images, error: imageError } = await supabase
    .from('product_images')
    .select('storage_path')
    .eq('product_id', productId);

  if (imageError) {
    return imageError.message;
  }

  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) {
    return error.message;
  }

  const paths = (images ?? []).map((image) => image.storage_path).filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(paths);
  }

  await requestStorefrontRebuild();
  return null;
}

export async function setProductStatus(
  supabase: SupabaseClient<Database>,
  product: ProductRecord,
  status: ContentStatus,
): Promise<string | null> {
  if (status === 'published') {
    const { data: qualities, error: qualityError } = await supabase
      .from('product_qualities')
      .select('quality, price')
      .eq('product_id', product.id);

    if (qualityError) {
      return qualityError.message;
    }

    if (!hasCompleteQualityPrices(qualities ?? [])) {
      return 'Set a Top 1:1 Clone price before publishing.';
    }

    const [{ data: images, error: imageError }, { data: joins, error: joinError }] = await Promise.all([
      supabase.from('product_images').select('storage_path').eq('product_id', product.id),
      supabase.from('product_collections').select('collection_id').eq('product_id', product.id),
    ]);

    if (imageError) {
      return imageError.message;
    }

    if (joinError) {
      return joinError.message;
    }

    if (!images?.some((image) => Boolean(image.storage_path?.trim()))) {
      return 'Add a product image before publishing.';
    }

    if (!product.primary_collection_id && !joins?.length) {
      return 'Assign a collection before publishing.';
    }
  }

  const { error } = await supabase
    .from('products')
    .update({
      status,
      published_at: publishedAtForStatus(status, product.published_at),
    })
    .eq('id', product.id);

  if (error) {
    return error.message;
  }

  if (status === 'published' || product.status === 'published') {
    await requestStorefrontRebuild();
  }

  return null;
}

export async function deleteProductImage(
  supabase: SupabaseClient<Database>,
  productId: string,
  imageId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('product_images')
    .select('storage_path')
    .eq('id', imageId)
    .eq('product_id', productId)
    .maybeSingle();

  if (error) {
    return error.message;
  }

  if (!data) {
    return 'Image not found.';
  }

  const { error: deleteError } = await supabase
    .from('product_images')
    .delete()
    .eq('id', imageId)
    .eq('product_id', productId);

  if (deleteError) {
    return deleteError.message;
  }

  await removeAdminImage(supabase, PRODUCT_IMAGE_BUCKET, data.storage_path);
  return null;
}
