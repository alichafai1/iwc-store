import { KEYWORD_LOCATIONS, type ProductGeneration } from './schemas.js';

export interface SourceSpec {
  label: string;
  value: string;
}

export interface UsedKeywordReport {
  keyword: string;
  locations: string[];
}

export interface UnusedKeywordReport {
  keyword: string;
  reason: string;
}

export interface CoverageResult {
  primaryUsed: boolean;
  usedKeywords: UsedKeywordReport[];
  unusedKeywords: UnusedKeywordReport[];
  coveragePercent: number;
  stuffingDetected: boolean;
  missingRequired: string[];
  warnings: string[];
  factualAccuracy: boolean;
}

const LOCATION_FIELDS: Record<(typeof KEYWORD_LOCATIONS)[number], (product: ProductGeneration['product']) => string> = {
  title: (product) => product.title,
  short_description: (product) => product.short_description,
  about_heading: (product) => product.about_heading,
  description: (product) => product.description,
  features: (product) => product.features.map((item) => item.feature_text).join('\n'),
  faq: (product) => product.faqs.flatMap((faq) => [faq.question, faq.answer]).join('\n'),
  meta_title: (product) => product.meta_title,
  meta_description: (product) => product.meta_description,
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function keywordInText(keyword: string, text: string): boolean {
  const needle = normalize(keyword);
  if (!needle) {
    return false;
  }
  return ` ${normalize(text)} `.includes(` ${needle} `) || normalize(text).includes(needle);
}

function countOccurrences(keyword: string, text: string): number {
  const needle = normalize(keyword);
  if (!needle) {
    return 0;
  }
  const haystack = normalize(text);
  let count = 0;
  let index = 0;
  while (index < haystack.length) {
    const found = haystack.indexOf(needle, index);
    if (found === -1) {
      break;
    }
    count += 1;
    index = found + needle.length;
  }
  return count;
}

export function productText(product: ProductGeneration['product']): string {
  return [
    product.title,
    product.slug,
    product.short_description,
    product.about_heading,
    product.description,
    product.meta_title,
    product.meta_description,
    ...product.features.map((item) => item.feature_text),
    ...product.specifications.flatMap((spec) => [spec.label, spec.value]),
    ...product.faqs.flatMap((faq) => [faq.question, faq.answer]),
  ].join('\n');
}

export function locateKeyword(keyword: string, product: ProductGeneration['product']): string[] {
  return KEYWORD_LOCATIONS.filter((location) => keywordInText(keyword, LOCATION_FIELDS[location](product)));
}

export function parseSourceSpecs(value: unknown): SourceSpec[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const rows: SourceSpec[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const record = item as Record<string, unknown>;
    const label = typeof record.label === 'string' ? record.label.replace(/\s+/g, ' ').trim() : '';
    const specValue = typeof record.value === 'string' ? record.value.replace(/\s+/g, ' ').trim() : '';
    if (label && specValue) {
      rows.push({ label, value: specValue });
    }
  }
  return rows;
}

export function parseStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === 'string' ? item.replace(/\s+/g, ' ').trim() : ''))
    .filter(Boolean);
}

export function filterFactualSpecs(generated: SourceSpec[], source: SourceSpec[]): SourceSpec[] {
  if (source.length === 0) {
    return [];
  }

  const sourceText = normalize(source.map((row) => `${row.label} ${row.value}`).join(' '));
  return generated.filter((row) => {
    const value = normalize(row.value);
    return value.length > 0 && sourceText.includes(value);
  });
}

const REQUIRED_FIELDS: Array<[keyof ProductGeneration['product'], string]> = [
  ['title', 'title'],
  ['slug', 'slug'],
  ['short_description', 'short description'],
  ['about_heading', 'about heading'],
  ['description', 'description'],
  ['meta_title', 'meta title'],
  ['meta_description', 'meta description'],
];

export function validateGeneratedProduct(options: {
  generated: ProductGeneration;
  selectedKeywords: string[];
  sourceSpecs: SourceSpec[];
  sourcePrice: number | null;
}): CoverageResult {
  const { generated } = options;
  const text = productText(generated.product);
  const reportedReasons = new Map(
    generated.keyword_strategy.unused_keywords.map((item) => [item.keyword.toLowerCase().replace(/\s+/g, ' ').trim(), item.reason]),
  );
  const selected = uniqueKeywords([
    generated.keyword_strategy.primary_keyword,
    ...generated.keyword_strategy.secondary_keywords,
    ...generated.keyword_strategy.supporting_keywords,
    ...generated.keyword_strategy.used_keywords.map((item) => item.keyword),
    ...generated.keyword_strategy.unused_keywords.map((item) => item.keyword),
    ...options.selectedKeywords,
  ]);

  const usedKeywords: UsedKeywordReport[] = [];
  const unusedKeywords: UnusedKeywordReport[] = [];

  for (const keyword of selected) {
    const locations = locateKeyword(keyword, generated.product);
    if (locations.length > 0) {
      usedKeywords.push({ keyword, locations });
    } else {
      unusedKeywords.push({
        keyword,
        reason: reportedReasons.get(keyword.toLowerCase()) || 'could not be inserted naturally without stuffing',
      });
    }
  }

  const coveragePercent =
    selected.length === 0 ? 100 : Math.round((usedKeywords.length / selected.length) * 1000) / 10;

  const stuffing =
    generated.validation.keyword_stuffing_detected ||
    selected.some((keyword) => countOccurrences(keyword, text) >= 8) ||
    /\b(\w+)(?:\s+\1){3,}\b/i.test(text);

  const missingRequired = REQUIRED_FIELDS.filter(([key]) => !String(generated.product[key] ?? '').trim()).map(
    ([, label]) => label,
  );
  if (generated.product.features.length === 0) {
    missingRequired.push('features');
  }
  if (generated.product.faqs.length === 0) {
    missingRequired.push('faqs');
  }
  if (generated.product.reviews.length < 4) {
    missingRequired.push('reviews');
  }

  const inventedSpecs = generated.product.specifications.filter((spec) => {
    const value = normalize(spec.value);
    if (!value) {
      return false;
    }
    return !options.sourceSpecs.some(
      (row) => normalize(row.value) === value || normalize(`${row.label} ${row.value}`).includes(value),
    );
  });

  const warnings = [...generated.validation.warnings];
  if (inventedSpecs.length > 0) {
    warnings.push('Dropped specifications that were not present in the raw source data.');
  }
  if (options.sourcePrice == null && generated.product.price != null) {
    warnings.push('Invented price was ignored; source had no valid price.');
  }

  const sentences = text.split(/[.!?]+/).filter((part) => part.trim().length > 0);
  const avgWords =
    sentences.length === 0
      ? 0
      : sentences.reduce((sum, sentence) => sum + sentence.trim().split(/\s+/).length, 0) / sentences.length;
  if (avgWords > 42) {
    warnings.push('Description may be hard to read; sentences are long.');
  }

  const primary = generated.keyword_strategy.primary_keyword.trim();
  const primaryUsed = !primary || keywordInText(primary, text);
  if (primary && !primaryUsed) {
    warnings.push('Primary keyword was not used in the generated copy.');
  }

  return {
    primaryUsed,
    usedKeywords,
    unusedKeywords,
    coveragePercent,
    stuffingDetected: stuffing,
    missingRequired,
    warnings,
    factualAccuracy: inventedSpecs.length === 0 && generated.validation.factual_accuracy,
  };
}

export function uniqueKeywords(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.replace(/\s+/g, ' ').trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export function shouldRevise(coverage: CoverageResult): boolean {
  if (coverage.stuffingDetected) {
    return true;
  }
  if (coverage.missingRequired.length > 0) {
    return true;
  }
  if (!coverage.primaryUsed) {
    return true;
  }
  const recoverable = coverage.unusedKeywords.filter(
    (item) => !/not relevant|conflicts with source facts|duplicate search intent/i.test(item.reason),
  );
  return recoverable.length > 0 && coverage.coveragePercent < 85;
}

export function extractCompareAtPrice(rawData: unknown, sourcePrice: number | null): number | null {
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
    return null;
  }

  const record = rawData as Record<string, unknown>;
  const candidates = [
    record.compare_at_price,
    record.compareAtPrice,
    record.list_price,
    record.listPrice,
    record.was_price,
    record.wasPrice,
    record.regular_price,
    record.regularPrice,
  ];

  for (const candidate of candidates) {
    const amount = typeof candidate === 'number' ? candidate : typeof candidate === 'string' ? Number.parseFloat(candidate) : NaN;
    if (Number.isFinite(amount) && amount >= 0 && (sourcePrice == null || amount !== sourcePrice)) {
      return amount;
    }
  }

  return null;
}
