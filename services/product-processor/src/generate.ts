import { PRODUCT_SEO_MASTER_PROMPT } from './prompts/product-seo.js';
import type { GlobalKeyword, WebsiteCollection } from './keywords.js';
import type { ContentAiProvider } from './providers/index.js';
import { productGenerationSchema, type ProductGeneration } from './schemas.js';
import {
  extractCompareAtPrice,
  filterFactualSpecs,
  parseSourceSpecs,
  parseStringList,
  uniqueKeywords,
  validateGeneratedProduct,
  shouldRevise,
  type CoverageResult,
} from './validate.js';

const MERCHANDISING_SLUGS = new Set(['best-sellers', 'new-arrivals']);

export interface RawProductRow {
  id: string;
  processed_product_id: string | null;
  scrape_status: string;
  source_url: string;
  source_title: string | null;
  source_description: string | null;
  source_price: number | null;
  source_currency: string | null;
  source_model: string | null;
  source_brand: string | null;
  source_category: string | null;
  source_collection_name: string | null;
  source_collection_url: string | null;
  source_specifications: unknown;
  source_primary_specs: unknown;
  source_additional_information: unknown;
  source_features: unknown;
  raw_data: unknown;
}

export interface GeneratedDraft {
  generated: ProductGeneration;
  coverage: CoverageResult;
  attempts: number;
}

function sourcePayload(raw: RawProductRow) {
  return {
    source_title: raw.source_title,
    source_url: raw.source_url,
    source_collection: raw.source_collection_name,
    source_collection_url: raw.source_collection_url,
    brand: raw.source_brand,
    model: raw.source_model,
    source_price: raw.source_price,
    currency: raw.source_currency,
    source_description: raw.source_description,
    primary_specifications: parseSourceSpecs(raw.source_primary_specs),
    specifications: parseSourceSpecs(raw.source_specifications),
    additional_information: parseSourceSpecs(raw.source_additional_information),
    category: raw.source_category,
    features: parseStringList(raw.source_features),
  };
}

function keywordPayload(keywords: GlobalKeyword[]) {
  return keywords.map((row) => ({
    keyword: row.keyword,
    search_volume: row.search_volume,
    keyword_difficulty: row.keyword_difficulty,
    cpc: row.cpc,
    intent: row.intent,
    ranking_position: row.position ?? null,
  }));
}

function allowedCollectionPayload(collections: WebsiteCollection[]) {
  return collections
    .filter((collection) => !MERCHANDISING_SLUGS.has(collection.slug))
    .map((collection) => ({ name: collection.name, slug: collection.slug }));
}

function normalizeReviewDate(value: string): string | null {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return new Date(parsed).toISOString().slice(0, 10);
}

function sanitizeReviews(reviews: ProductGeneration['product']['reviews']): ProductGeneration['product']['reviews'] {
  const cleaned: ProductGeneration['product']['reviews'] = [];
  for (const review of reviews) {
    const title = review.title.replace(/\s+/g, ' ').trim();
    const customerName = review.customer_name.replace(/\s+/g, ' ').trim();
    const reviewText = review.review_text.replace(/\s+/g, ' ').trim();
    const reviewDate = normalizeReviewDate(review.review_date);
    if (!title || !customerName || !reviewText || !reviewDate) {
      continue;
    }
    if (review.rating !== 4 && review.rating !== 5) {
      continue;
    }
    cleaned.push({
      title: title.slice(0, 180),
      rating: review.rating,
      customer_name: customerName.slice(0, 120),
      review_date: reviewDate,
      review_text: reviewText.slice(0, 2000),
    });
  }
  return cleaned.slice(0, 9);
}

function applyCoverage(generated: ProductGeneration, coverage: CoverageResult): ProductGeneration {
  generated.keyword_strategy.used_keywords = coverage.usedKeywords;
  generated.keyword_strategy.unused_keywords = coverage.unusedKeywords;
  generated.keyword_strategy.coverage_percent = coverage.coveragePercent;
  generated.validation.keyword_stuffing_detected = coverage.stuffingDetected;
  generated.validation.missing_required_content = coverage.missingRequired;
  generated.validation.warnings = coverage.warnings;
  generated.validation.factual_accuracy = coverage.factualAccuracy;
  return generated;
}

function applyGuards(
  generated: ProductGeneration,
  raw: RawProductRow,
  allowedCollections: WebsiteCollection[],
  fallbackSlug: string,
): ProductGeneration {
  const sourceSpecs = [
    ...parseSourceSpecs(raw.source_primary_specs),
    ...parseSourceSpecs(raw.source_specifications),
    ...parseSourceSpecs(raw.source_additional_information),
  ];
  const sourcePrice =
    raw.source_price != null && Number.isFinite(Number(raw.source_price)) ? Number(raw.source_price) : null;
  const allowedSlugs = new Set(
    allowedCollections.filter((collection) => !MERCHANDISING_SLUGS.has(collection.slug)).map((collection) => collection.slug),
  );
  const chosen = generated.product.collection_slugs.filter((slug) => allowedSlugs.has(slug));

  generated.product.specifications = filterFactualSpecs(generated.product.specifications, sourceSpecs);
  generated.product.reviews = sanitizeReviews(generated.product.reviews);
  generated.product.quality = 'Top 1:1 Clone';
  generated.product.price = sourcePrice;
  generated.product.compare_at_price = extractCompareAtPrice(raw.raw_data, sourcePrice);
  generated.product.collection_slugs = chosen.length > 0 ? chosen : allowedSlugs.has(fallbackSlug) ? [fallbackSlug] : [];
  generated.product.features = generated.product.features
    .map((item) => ({ feature_text: item.feature_text.replace(/\s+/g, ' ').trim() }))
    .filter((item) => item.feature_text);
  generated.product.faqs = generated.product.faqs
    .map((item) => ({
      question: item.question.replace(/\s+/g, ' ').trim(),
      answer: item.answer.replace(/\s+/g, ' ').trim(),
    }))
    .filter((item) => item.question && item.answer);
  generated.keyword_strategy.secondary_keywords = uniqueKeywords(generated.keyword_strategy.secondary_keywords);
  generated.keyword_strategy.supporting_keywords = uniqueKeywords(generated.keyword_strategy.supporting_keywords);

  const coverage = validateGeneratedProduct({
    generated,
    selectedKeywords: uniqueKeywords([
      generated.keyword_strategy.primary_keyword,
      ...generated.keyword_strategy.secondary_keywords,
      ...generated.keyword_strategy.supporting_keywords,
    ]),
    sourceSpecs,
    sourcePrice,
  });
  return applyCoverage(generated, coverage);
}

function buildUserPayload(options: {
  raw: RawProductRow;
  keywords: GlobalKeyword[];
  allowedCollections: WebsiteCollection[];
  extra?: Record<string, unknown>;
}): string {
  return JSON.stringify({
    RAW_PRODUCT: sourcePayload(options.raw),
    KEYWORDS: keywordPayload(options.keywords),
    ALLOWED_COLLECTIONS: allowedCollectionPayload(options.allowedCollections),
    ...options.extra,
  });
}

const JSON_ONLY_INSTRUCTION =
  'You are a JSON content generator in Ask/read-only mode. Do not edit files, run commands, browse the repository, or call any tools. Return ONLY the required JSON object. No markdown. No code fences. No commentary.';

function logValidation(provider: string, model: string, attempt: number, coverage: CoverageResult) {
  console.info(
    `[ai] provider=${provider} model=${model} attempt=${attempt} validation=${shouldRevise(coverage) ? 'revise' : 'pass'} stuffing=${coverage.stuffingDetected} unused=${coverage.unusedKeywords.length} missing=${coverage.missingRequired.length} coverage=${coverage.coveragePercent}`,
  );
}

export async function generateProductDraft(options: {
  provider: ContentAiProvider;
  raw: RawProductRow;
  productKeywords: GlobalKeyword[];
  allowedCollections: WebsiteCollection[];
  collectionSlug: string;
}): Promise<GeneratedDraft> {
  const user = buildUserPayload({
    raw: options.raw,
    keywords: options.productKeywords,
    allowedCollections: options.allowedCollections,
  });

  const first = await options.provider.generateJson({
    system: PRODUCT_SEO_MASTER_PROMPT,
    user,
    schemaName: 'product_generation',
    validator: productGenerationSchema,
    jsonOnlyInstruction: JSON_ONLY_INSTRUCTION,
  });
  let generated = first.data;

  generated = applyGuards(generated, options.raw, options.allowedCollections, options.collectionSlug);
  let coverage = validateGeneratedProduct({
    generated,
    selectedKeywords: uniqueKeywords([
      generated.keyword_strategy.primary_keyword,
      ...generated.keyword_strategy.secondary_keywords,
      ...generated.keyword_strategy.supporting_keywords,
    ]),
    sourceSpecs: [
      ...parseSourceSpecs(options.raw.source_primary_specs),
      ...parseSourceSpecs(options.raw.source_specifications),
      ...parseSourceSpecs(options.raw.source_additional_information),
    ],
    sourcePrice: options.raw.source_price,
  });

  logValidation(first.meta.provider, first.meta.model, 1, coverage);
  let attempts = 1;
  while (attempts <= 2 && shouldRevise(coverage)) {
    attempts += 1;
    const revision = await options.provider.generateJson({
      system: PRODUCT_SEO_MASTER_PROMPT,
      user: buildUserPayload({
        raw: options.raw,
        keywords: options.productKeywords,
        allowedCollections: options.allowedCollections,
        extra: {
          REVISION: {
            instruction:
              'Improve the previous draft. Increase natural keyword coverage without stuffing, repetition, invented facts, or reduced readability. Keep 4 to 9 synthetic test reviews with a different count, varied names, and no invented specs. Keep quality Top 1:1 Clone.',
            previous_draft: generated,
            unused_keywords: coverage.unusedKeywords,
            missing_required_content: coverage.missingRequired,
            stuffing_detected: coverage.stuffingDetected,
          },
        },
      }),
      schemaName: `product_generation_revision_${attempts - 1}`,
      validator: productGenerationSchema,
      jsonOnlyInstruction: JSON_ONLY_INSTRUCTION,
    });
    generated = revision.data;
    generated = applyGuards(generated, options.raw, options.allowedCollections, options.collectionSlug);
    coverage = validateGeneratedProduct({
      generated,
      selectedKeywords: uniqueKeywords([
        generated.keyword_strategy.primary_keyword,
        ...generated.keyword_strategy.secondary_keywords,
        ...generated.keyword_strategy.supporting_keywords,
      ]),
      sourceSpecs: [
        ...parseSourceSpecs(options.raw.source_primary_specs),
        ...parseSourceSpecs(options.raw.source_specifications),
        ...parseSourceSpecs(options.raw.source_additional_information),
      ],
      sourcePrice: options.raw.source_price,
    });
    logValidation(revision.meta.provider, revision.meta.model, attempts, coverage);
  }

  return { generated, coverage, attempts };
}
