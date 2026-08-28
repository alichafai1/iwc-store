import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '../../types/database';
import { sortCollectionsByStoreOrder } from '../../data/collections';
import {
  COLLECTION_IMAGE_BUCKET,
  type ContentStatus,
} from './constants';
import { formBoolean, formLines, formOptional, formStatus, formString, formStringList, uniqueConstraintMessage } from './forms';
import { sanitizeSearch } from './query';
import { isValidSlug, slugify } from './slug';
import { publishedAtForStatus } from './status';
import { removeAdminImage, uploadAdminImage, validateImageFile } from './storage';
import { normalizeKeyword } from './keyword-parse';
import { requestStorefrontRebuild } from '../rebuild';

export type CollectionRecord = Tables<'collections'>;

export interface CollectionListItem extends CollectionRecord {
  product_count: number;
}

export interface CollectionFeatureInput {
  featureText: string;
  position: number;
}

export interface CollectionFaqInput {
  question: string;
  answer: string;
  position: number;
}

export interface CollectionRelatedInput {
  relatedCollectionId: string;
  anchorText: string | null;
  context: string | null;
  position: number;
}

export interface CollectionComparisonInput {
  comparedCollectionId: string;
  body: string | null;
  position: number;
}

export interface CollectionInternalLinkInput {
  label: string;
  href: string;
  position: number;
}

export interface CollectionInput {
  name: string;
  slug: string;
  description: string | null;
  seo_intro: string | null;
  seo_content: string | null;
  about_content: string | null;
  overview_content: string | null;
  history_content: string | null;
  models_guide_heading: string | null;
  models_guide_content: string | null;
  buying_guide_content: string | null;
  comparison_content: string | null;
  related_intro: string | null;
  faq_heading: string | null;
  why_choose_heading: string | null;
  why_choose_content: string | null;
  h1: string | null;
  image_alt: string | null;
  meta_title: string | null;
  meta_description: string | null;
  featured: boolean;
  status: ContentStatus;
  features: CollectionFeatureInput[];
  faqs: CollectionFaqInput[];
  relatedCollections: CollectionRelatedInput[];
  comparisons: CollectionComparisonInput[];
  internalLinks: CollectionInternalLinkInput[];
  popularModelSlugs: string[];
  mappedKeywords: string[];
}

export interface CollectionSeoEditor {
  features: { feature_text: string; position: number }[];
  faqs: { question: string; answer: string; position: number }[];
  relatedCollections: CollectionRelatedInput[];
  comparisons: CollectionComparisonInput[];
  internalLinks: CollectionInternalLinkInput[];
  popularModelSlugs: string[];
  mappedKeywords: string[];
}

function isInternalHref(href: string): boolean {
  return /^\/([^/]|$)/.test(href) && !href.startsWith('//');
}

export async function listCollections(
  supabase: SupabaseClient<Database>,
  filters: { q?: string; status?: string },
): Promise<{ data: CollectionListItem[]; error: string | null }> {
  let query = supabase
    .from('collections')
    .select('*, product_collections(count)')
    .order('updated_at', { ascending: false });

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status as ContentStatus);
  }

  const search = sanitizeSearch(filters.q);
  if (search) {
    query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) {
    return { data: [], error: error.message };
  }

  const items = (data ?? []).map((row) => {
    const { product_collections, ...collection } = row as CollectionRecord & {
      product_collections: { count: number }[] | null;
    };

    return {
      ...collection,
      product_count: product_collections?.[0]?.count ?? 0,
    };
  });

  return { data: items, error: null };
}

export async function getCollection(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<{ data: CollectionRecord | null; error: string | null }> {
  const { data, error } = await supabase.from('collections').select('*').eq('id', id).maybeSingle();
  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getCollectionEditor(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<{ data: CollectionSeoEditor | null; error: string | null }> {
  const [featuresResult, faqsResult, relatedResult, comparisonResult, linkResult, popularResult, keywordResult] =
    await Promise.all([
      supabase.from('collection_features').select('feature_text, position').eq('collection_id', id).order('position'),
      supabase.from('collection_faqs').select('question, answer, position').eq('collection_id', id).order('position'),
      supabase
        .from('collection_related_collections')
        .select('related_collection_id, anchor_text, context, position')
        .eq('collection_id', id)
        .order('position'),
      supabase
        .from('collection_comparisons')
        .select('compared_collection_id, body, position')
        .eq('collection_id', id)
        .order('position'),
      supabase
        .from('collection_internal_links')
        .select('label, href, position')
        .eq('collection_id', id)
        .order('position'),
      supabase
        .from('collection_popular_models')
        .select('position, product:product_id(slug)')
        .eq('collection_id', id)
        .order('position'),
      supabase
        .from('collection_keywords')
        .select('position, keyword:keyword_id(keyword)')
        .eq('collection_id', id)
        .order('position'),
    ]);

  const error =
    featuresResult.error?.message ||
    faqsResult.error?.message ||
    relatedResult.error?.message ||
    comparisonResult.error?.message ||
    linkResult.error?.message ||
    popularResult.error?.message ||
    keywordResult.error?.message;

  if (error) {
    return { data: null, error };
  }

  const popularRows = (popularResult.data ?? []) as Array<{ position: number; product: { slug: string } | null }>;
  const keywordRows = (keywordResult.data ?? []) as Array<{ position: number; keyword: { keyword: string } | null }>;

  return {
    data: {
      features: featuresResult.data ?? [],
      faqs: faqsResult.data ?? [],
      relatedCollections: (relatedResult.data ?? []).map((row, position) => ({
        relatedCollectionId: row.related_collection_id,
        anchorText: row.anchor_text,
        context: row.context,
        position: row.position ?? position,
      })),
      comparisons: (comparisonResult.data ?? []).map((row, position) => ({
        comparedCollectionId: row.compared_collection_id,
        body: row.body,
        position: row.position ?? position,
      })),
      internalLinks: (linkResult.data ?? []).map((row, position) => ({
        label: row.label,
        href: row.href,
        position: row.position ?? position,
      })),
      popularModelSlugs: popularRows.flatMap((row) => (row.product?.slug ? [row.product.slug] : [])),
      mappedKeywords: keywordRows.flatMap((row) => (row.keyword?.keyword ? [row.keyword.keyword] : [])),
    },
    error: null,
  };
}

export interface CollectionOption {
  id: string;
  name: string;
  slug: string;
  status: ContentStatus;
}

export async function collectionOptions(
  supabase: SupabaseClient<Database>,
): Promise<{ data: CollectionOption[]; error: string | null }> {
  const { data, error } = await supabase.from('collections').select('id, name, slug, status');

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: sortCollectionsByStoreOrder(data ?? []), error: null };
}

export function parseCollectionForm(form: FormData): CollectionInput | { error: string } {
  const name = formString(form, 'name');
  if (!name) {
    return { error: 'Name is required.' };
  }

  const slugValue = formString(form, 'slug') || slugify(name);
  if (!isValidSlug(slugValue)) {
    return { error: 'Slug must use lowercase letters, numbers, and hyphens.' };
  }

  const featureTexts = formStringList(form, 'feature_texts');
  const features: CollectionFeatureInput[] = [];
  for (const featureText of featureTexts) {
    const value = featureText.trim();
    if (!value) {
      continue;
    }
    features.push({ featureText: value, position: features.length });
  }

  const faqQuestions = formStringList(form, 'faq_questions');
  const faqAnswers = formStringList(form, 'faq_answers');
  const faqs: CollectionFaqInput[] = [];
  for (let index = 0; index < faqQuestions.length; index += 1) {
    const question = (faqQuestions[index] ?? '').trim();
    const answer = (faqAnswers[index] ?? '').trim();
    if (!question && !answer) {
      continue;
    }
    if (!question || !answer) {
      return { error: 'Each FAQ needs a question and an answer.' };
    }
    faqs.push({ question, answer, position: faqs.length });
  }

  const relatedIds = formStringList(form, 'related_collection_ids');
  const relatedAnchors = formStringList(form, 'related_anchor_texts');
  const relatedContexts = formStringList(form, 'related_contexts');
  const relatedCollections: CollectionRelatedInput[] = [];
  const seenRelated = new Set<string>();
  for (let index = 0; index < relatedIds.length; index += 1) {
    const relatedCollectionId = (relatedIds[index] ?? '').trim();
    if (!relatedCollectionId) {
      continue;
    }
    if (seenRelated.has(relatedCollectionId)) {
      return { error: 'Related collections must be unique.' };
    }
    seenRelated.add(relatedCollectionId);
    relatedCollections.push({
      relatedCollectionId,
      anchorText: (relatedAnchors[index] ?? '').trim() || null,
      context: (relatedContexts[index] ?? '').trim() || null,
      position: relatedCollections.length,
    });
  }

  const comparisonIds = formStringList(form, 'comparison_collection_ids');
  const comparisonBodies = formStringList(form, 'comparison_bodies');
  const comparisons: CollectionComparisonInput[] = [];
  const seenComparisons = new Set<string>();
  for (let index = 0; index < comparisonIds.length; index += 1) {
    const comparedCollectionId = (comparisonIds[index] ?? '').trim();
    if (!comparedCollectionId) {
      continue;
    }
    if (seenComparisons.has(comparedCollectionId)) {
      return { error: 'Comparison collections must be unique.' };
    }
    seenComparisons.add(comparedCollectionId);
    comparisons.push({
      comparedCollectionId,
      body: (comparisonBodies[index] ?? '').trim() || null,
      position: comparisons.length,
    });
  }

  const linkLabels = formStringList(form, 'internal_link_labels');
  const linkHrefs = formStringList(form, 'internal_link_hrefs');
  const internalLinks: CollectionInternalLinkInput[] = [];
  for (let index = 0; index < Math.max(linkLabels.length, linkHrefs.length); index += 1) {
    const label = (linkLabels[index] ?? '').trim();
    const href = (linkHrefs[index] ?? '').trim();
    if (!label && !href) {
      continue;
    }
    if (!label || !href) {
      return { error: 'Each internal link needs anchor text and a path.' };
    }
    if (!isInternalHref(href)) {
      return { error: 'Internal links must be site paths starting with /.' };
    }
    internalLinks.push({ label, href, position: internalLinks.length });
  }

  return {
    name,
    slug: slugValue,
    description: formOptional(form, 'description'),
    seo_intro: formOptional(form, 'seo_intro'),
    seo_content: formOptional(form, 'seo_content'),
    about_content: formOptional(form, 'about_content'),
    overview_content: formOptional(form, 'overview_content'),
    history_content: formOptional(form, 'history_content'),
    models_guide_heading: formOptional(form, 'models_guide_heading'),
    models_guide_content: formOptional(form, 'models_guide_content'),
    buying_guide_content: formOptional(form, 'buying_guide_content'),
    comparison_content: formOptional(form, 'comparison_content'),
    related_intro: formOptional(form, 'related_intro'),
    faq_heading: formOptional(form, 'faq_heading'),
    why_choose_heading: formOptional(form, 'why_choose_heading'),
    why_choose_content: formOptional(form, 'why_choose_content'),
    h1: formOptional(form, 'h1'),
    image_alt: formOptional(form, 'image_alt'),
    meta_title: formOptional(form, 'meta_title'),
    meta_description: formOptional(form, 'meta_description'),
    featured: formBoolean(form, 'featured'),
    status: formStatus(form),
    features,
    faqs,
    relatedCollections,
    comparisons,
    internalLinks,
    popularModelSlugs: formLines(form, 'popular_model_slugs'),
    mappedKeywords: formLines(form, 'mapped_keywords'),
  };
}

async function replaceCollectionRows<T extends Record<string, unknown>>(
  supabase: SupabaseClient<Database>,
  table:
    | 'collection_features'
    | 'collection_faqs'
    | 'collection_related_collections'
    | 'collection_comparisons'
    | 'collection_internal_links'
    | 'collection_popular_models'
    | 'collection_keywords',
  collectionId: string,
  rows: T[],
): Promise<string | null> {
  const { error: deleteError } = await supabase.from(table).delete().eq('collection_id', collectionId);
  if (deleteError) {
    return deleteError.message;
  }

  if (rows.length === 0) {
    return null;
  }

  const { error } = await supabase.from(table).insert(rows);
  return error?.message ?? null;
}

async function resolvePopularModels(
  supabase: SupabaseClient<Database>,
  slugs: string[],
): Promise<{ productId: string; slug: string }[] | { error: string }> {
  const unique = [...new Set(slugs)];
  if (unique.length === 0) {
    return [];
  }

  const { data, error } = await supabase.from('products').select('id, slug').in('slug', unique);
  if (error) {
    return { error: error.message };
  }

  const bySlug = new Map((data ?? []).map((row) => [row.slug, row.id]));
  const missing = unique.filter((slug) => !bySlug.has(slug));
  if (missing.length > 0) {
    return { error: `Unknown product slugs: ${missing.join(', ')}.` };
  }

  return unique.map((slug) => ({ slug, productId: bySlug.get(slug)! }));
}

async function resolveMappedKeywords(
  supabase: SupabaseClient<Database>,
  keywords: string[],
): Promise<{ keywordId: string; keyword: string }[] | { error: string }> {
  const normalized = keywords.map((keyword) => ({ keyword, normalized: normalizeKeyword(keyword) }));
  const uniqueNormalized = [...new Set(normalized.map((item) => item.normalized).filter(Boolean))];
  if (uniqueNormalized.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('keywords')
    .select('id, keyword, normalized_keyword')
    .in('normalized_keyword', uniqueNormalized);

  if (error) {
    return { error: error.message };
  }

  const byNormalized = new Map(
    (data ?? []).flatMap((row) => (row.normalized_keyword ? [[row.normalized_keyword, row]] as const : [])),
  );
  const missing = uniqueNormalized.filter((value) => !byNormalized.has(value));
  if (missing.length > 0) {
    return { error: `Keywords must already exist in the library: ${missing.join(', ')}.` };
  }

  const seen = new Set<string>();
  const mapped: { keywordId: string; keyword: string }[] = [];
  for (const item of normalized) {
    const row = byNormalized.get(item.normalized);
    if (!row || seen.has(row.id)) {
      continue;
    }
    seen.add(row.id);
    mapped.push({ keywordId: row.id, keyword: row.keyword });
  }

  return mapped;
}

async function saveCollectionSeo(
  supabase: SupabaseClient<Database>,
  collectionId: string,
  input: CollectionInput,
): Promise<string | null> {
  const popular = await resolvePopularModels(supabase, input.popularModelSlugs);
  if ('error' in popular) {
    return popular.error;
  }

  const keywords = await resolveMappedKeywords(supabase, input.mappedKeywords);
  if ('error' in keywords) {
    return keywords.error;
  }

  const relatedRows = input.relatedCollections.filter((row) => row.relatedCollectionId !== collectionId);
  const comparisonRows = input.comparisons.filter((row) => row.comparedCollectionId !== collectionId);
  const featureError = await replaceCollectionRows(
    supabase,
    'collection_features',
    collectionId,
    input.features.map((feature) => ({
      collection_id: collectionId,
      feature_text: feature.featureText,
      position: feature.position,
    })),
  );
  if (featureError) {
    return featureError;
  }

  const faqError = await replaceCollectionRows(
    supabase,
    'collection_faqs',
    collectionId,
    input.faqs.map((faq) => ({
      collection_id: collectionId,
      question: faq.question,
      answer: faq.answer,
      position: faq.position,
    })),
  );
  if (faqError) {
    return faqError;
  }

  const relatedError = await replaceCollectionRows(
    supabase,
    'collection_related_collections',
    collectionId,
    relatedRows.map((row, position) => ({
      collection_id: collectionId,
      related_collection_id: row.relatedCollectionId,
      anchor_text: row.anchorText,
      context: row.context,
      position,
    })),
  );
  if (relatedError) {
    return relatedError;
  }

  const comparisonError = await replaceCollectionRows(
    supabase,
    'collection_comparisons',
    collectionId,
    comparisonRows.map((row, position) => ({
      collection_id: collectionId,
      compared_collection_id: row.comparedCollectionId,
      body: row.body,
      position,
    })),
  );
  if (comparisonError) {
    return comparisonError;
  }

  const linkError = await replaceCollectionRows(
    supabase,
    'collection_internal_links',
    collectionId,
    input.internalLinks.map((row, position) => ({
      collection_id: collectionId,
      label: row.label,
      href: row.href,
      position,
    })),
  );
  if (linkError) {
    return linkError;
  }

  const popularError = await replaceCollectionRows(
    supabase,
    'collection_popular_models',
    collectionId,
    popular.map((item, position) => ({
      collection_id: collectionId,
      product_id: item.productId,
      position,
    })),
  );
  if (popularError) {
    return popularError;
  }

  return replaceCollectionRows(
    supabase,
    'collection_keywords',
    collectionId,
    keywords.map((item, position) => ({
      collection_id: collectionId,
      keyword_id: item.keywordId,
      role: position === 0 ? 'primary' : 'supporting',
      position,
    })),
  );
}

export async function saveCollection(
  supabase: SupabaseClient<Database>,
  input: CollectionInput,
  options: {
    id?: string;
    current?: CollectionRecord | null;
    imageFile?: File | null;
    removeImage?: boolean;
  },
): Promise<{ id?: string; error?: string }> {
  if (!options.id) {
    return { error: 'Collections are predefined and cannot be created.' };
  }
  const current = options.current ?? null;

  if (options.imageFile && options.imageFile.size > 0 && !input.image_alt) {
    return { error: 'Image alt text is required when uploading a collection image.' };
  }

  if (current?.image_path && !options.removeImage && !input.image_alt) {
    return { error: 'Image alt text is required for the collection image.' };
  }

  const payload = {
    name: input.name,
    slug: input.slug,
    description: input.description,
    seo_intro: input.seo_intro,
    seo_content: input.seo_content,
    about_content: input.about_content,
    overview_content: input.overview_content,
    history_content: input.history_content,
    models_guide_heading: input.models_guide_heading,
    models_guide_content: input.models_guide_content,
    buying_guide_content: input.buying_guide_content,
    comparison_content: input.comparison_content,
    related_intro: input.related_intro,
    faq_heading: input.faq_heading,
    why_choose_heading: input.why_choose_heading,
    why_choose_content: input.why_choose_content,
    h1: input.h1,
    meta_title: input.meta_title,
    meta_description: input.meta_description,
    featured: input.featured,
    status: input.status,
    published_at: publishedAtForStatus(input.status, current?.published_at),
  };

  let collectionId = options.id;
  let imagePath = options.removeImage ? null : (current?.image_path ?? null);

  if (collectionId) {
    const { error } = await supabase
      .from('collections')
      .update({
        ...payload,
        image_path: imagePath,
        image_alt: imagePath ? input.image_alt : null,
      })
      .eq('id', collectionId);

    if (error) {
      return { error: uniqueConstraintMessage(error, 'slug') ?? error.message };
    }
  } else {
    const { data, error } = await supabase
      .from('collections')
      .insert({
        ...payload,
        image_path: null,
        image_alt: null,
      })
      .select('id')
      .single();

    if (error || !data) {
      return {
        error: uniqueConstraintMessage(error ?? {}, 'slug') ?? 'Could not create the collection.',
      };
    }

    collectionId = data.id;
  }

  if (options.removeImage && current?.image_path) {
    await removeAdminImage(supabase, COLLECTION_IMAGE_BUCKET, current.image_path);
  }

  if (options.imageFile && options.imageFile.size > 0) {
    const invalid = validateImageFile(options.imageFile);
    if (invalid) {
      return { id: collectionId, error: invalid };
    }

    const uploaded = await uploadAdminImage(
      supabase,
      COLLECTION_IMAGE_BUCKET,
      options.imageFile,
      collectionId,
    );
    if ('error' in uploaded) {
      return { id: collectionId, error: uploaded.error };
    }

    if (current?.image_path && current.image_path !== uploaded.path) {
      await removeAdminImage(supabase, COLLECTION_IMAGE_BUCKET, current.image_path);
    }

    imagePath = uploaded.path;
    const { error } = await supabase
      .from('collections')
      .update({
        image_path: imagePath,
        image_alt: input.image_alt,
      })
      .eq('id', collectionId);

    if (error) {
      return { id: collectionId, error: error.message };
    }
  }

  const seoError = await saveCollectionSeo(supabase, collectionId, input);
  if (seoError) {
    return { id: collectionId, error: seoError };
  }

  const affectsStorefront = input.status === 'published' || current?.status === 'published';
  if (affectsStorefront) {
    await requestStorefrontRebuild();
  }

  return { id: collectionId };
}

export async function deleteCollection(
  _supabase: SupabaseClient<Database>,
  _collection: CollectionRecord,
): Promise<string | null> {
  return 'Collections are predefined and cannot be deleted.';
}

export async function deleteCollectionImage(
  supabase: SupabaseClient<Database>,
  collection: CollectionRecord,
): Promise<string | null> {
  if (!collection.image_path) {
    return null;
  }

  const { error } = await supabase
    .from('collections')
    .update({ image_path: null, image_alt: null })
    .eq('id', collection.id);

  if (error) {
    return error.message;
  }

  await removeAdminImage(supabase, COLLECTION_IMAGE_BUCKET, collection.image_path);
  return null;
}

export async function setCollectionStatus(
  supabase: SupabaseClient<Database>,
  collection: CollectionRecord,
  status: ContentStatus,
): Promise<string | null> {
  const { error } = await supabase
    .from('collections')
    .update({
      status,
      published_at: publishedAtForStatus(status, collection.published_at),
    })
    .eq('id', collection.id);

  return error?.message ?? null;
}
