import { z } from 'zod';

const stringArray = z.array(z.string());

export const KEYWORD_LOCATIONS = [
  'title',
  'short_description',
  'about_heading',
  'description',
  'features',
  'faq',
  'meta_title',
  'meta_description',
] as const;

export const labeledValueSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const featureItemSchema = z.object({
  feature_text: z.string(),
});

export const faqItemSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

export const reviewItemSchema = z.object({
  title: z.string(),
  rating: z.coerce.number().int().min(4).max(5),
  customer_name: z.string(),
  review_date: z.string(),
  review_text: z.string(),
});

export const usedKeywordSchema = z.object({
  keyword: z.string(),
  locations: stringArray,
});

export const unusedKeywordSchema = z.object({
  keyword: z.string(),
  reason: z.string(),
});

export const productGenerationSchema = z.object({
  keyword_strategy: z.object({
    primary_keyword: z.string(),
    secondary_keywords: stringArray,
    supporting_keywords: stringArray,
    used_keywords: z.array(usedKeywordSchema),
    unused_keywords: z.array(unusedKeywordSchema),
    coverage_percent: z.number(),
  }),
  product: z.object({
    title: z.string(),
    slug: z.string(),
    short_description: z.string(),
    about_heading: z.string(),
    description: z.string(),
    specifications: z.array(labeledValueSchema),
    features: z.array(featureItemSchema),
    faqs: z.array(faqItemSchema),
    reviews: z.array(reviewItemSchema),
    meta_title: z.string(),
    meta_description: z.string(),
    collection_slugs: stringArray,
    quality: z.literal('Top 1:1 Clone'),
    price: z.number().nullable(),
    compare_at_price: z.number().nullable(),
  }),
  validation: z.object({
    factual_accuracy: z.boolean(),
    keyword_stuffing_detected: z.boolean(),
    missing_required_content: stringArray,
    warnings: stringArray,
  }),
});

export type ProductGeneration = z.infer<typeof productGenerationSchema>;

export const collectionKeywordBatchSchema = z.object({
  relevant_keywords: stringArray,
});

export type CollectionKeywordBatch = z.infer<typeof collectionKeywordBatchSchema>;

const labeledValueJson = {
  type: 'object',
  additionalProperties: false,
  properties: {
    label: { type: 'string' },
    value: { type: 'string' },
  },
  required: ['label', 'value'],
} as const;

const featureJson = {
  type: 'object',
  additionalProperties: false,
  properties: {
    feature_text: { type: 'string' },
  },
  required: ['feature_text'],
} as const;

const faqJson = {
  type: 'object',
  additionalProperties: false,
  properties: {
    question: { type: 'string' },
    answer: { type: 'string' },
  },
  required: ['question', 'answer'],
} as const;

const reviewJson = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    rating: { type: 'integer', minimum: 4, maximum: 5 },
    customer_name: { type: 'string' },
    review_date: { type: 'string' },
    review_text: { type: 'string' },
  },
  required: ['title', 'rating', 'customer_name', 'review_date', 'review_text'],
} as const;

const usedKeywordJson = {
  type: 'object',
  additionalProperties: false,
  properties: {
    keyword: { type: 'string' },
    locations: { type: 'array', items: { type: 'string' } },
  },
  required: ['keyword', 'locations'],
} as const;

const unusedKeywordJson = {
  type: 'object',
  additionalProperties: false,
  properties: {
    keyword: { type: 'string' },
    reason: { type: 'string' },
  },
  required: ['keyword', 'reason'],
} as const;

export const productGenerationJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    keyword_strategy: {
      type: 'object',
      additionalProperties: false,
      properties: {
        primary_keyword: { type: 'string' },
        secondary_keywords: { type: 'array', items: { type: 'string' } },
        supporting_keywords: { type: 'array', items: { type: 'string' } },
        used_keywords: { type: 'array', items: usedKeywordJson },
        unused_keywords: { type: 'array', items: unusedKeywordJson },
        coverage_percent: { type: 'number' },
      },
      required: [
        'primary_keyword',
        'secondary_keywords',
        'supporting_keywords',
        'used_keywords',
        'unused_keywords',
        'coverage_percent',
      ],
    },
    product: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string' },
        slug: { type: 'string' },
        short_description: { type: 'string' },
        about_heading: { type: 'string' },
        description: { type: 'string' },
        specifications: { type: 'array', items: labeledValueJson },
        features: { type: 'array', items: featureJson },
        faqs: { type: 'array', items: faqJson },
        reviews: { type: 'array', items: reviewJson },
        meta_title: { type: 'string' },
        meta_description: { type: 'string' },
        collection_slugs: { type: 'array', items: { type: 'string' } },
        quality: { type: 'string', enum: ['Top 1:1 Clone'] },
        price: { type: ['number', 'null'] },
        compare_at_price: { type: ['number', 'null'] },
      },
      required: [
        'title',
        'slug',
        'short_description',
        'about_heading',
        'description',
        'specifications',
        'features',
        'faqs',
        'reviews',
        'meta_title',
        'meta_description',
        'collection_slugs',
        'quality',
        'price',
        'compare_at_price',
      ],
    },
    validation: {
      type: 'object',
      additionalProperties: false,
      properties: {
        factual_accuracy: { type: 'boolean' },
        keyword_stuffing_detected: { type: 'boolean' },
        missing_required_content: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } },
      },
      required: ['factual_accuracy', 'keyword_stuffing_detected', 'missing_required_content', 'warnings'],
    },
  },
  required: ['keyword_strategy', 'product', 'validation'],
} as const;

export const collectionKeywordBatchJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    relevant_keywords: { type: 'array', items: { type: 'string' } },
  },
  required: ['relevant_keywords'],
} as const;
