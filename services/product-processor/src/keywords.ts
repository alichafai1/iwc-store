import type { ProcessorEnv } from './env.js';
import type { ProcessorSupabase } from './supabase.js';
import type { ContentAiProvider } from './providers/index.js';
import { chunk } from './pool.js';
import { collectionKeywordBatchSchema } from './schemas.js';

const KEYWORD_PAGE_SIZE = 1_000;
const MERCHANDISING_SLUGS = new Set(['best-sellers', 'new-arrivals']);

export interface GlobalKeyword {
  keyword: string;
  search_volume: number | null;
  keyword_difficulty: number | null;
  intent: string | null;
  cpc: number | null;
  position?: number | null;
}

export interface WebsiteCollection {
  id: string;
  name: string;
  slug: string;
}

export async function loadAllGlobalKeywords(supabase: ProcessorSupabase): Promise<GlobalKeyword[]> {
  const rows: GlobalKeyword[] = [];
  let from = 0;

  while (true) {
    const to = from + KEYWORD_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('keywords')
      .select('keyword, search_volume, keyword_difficulty, intent, cpc, position')
      .order('normalized_keyword', { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Could not load the Global Keyword Library: ${error.message}`);
    }

    const page = (data ?? []) as GlobalKeyword[];
    rows.push(...page);
    if (page.length < KEYWORD_PAGE_SIZE) {
      break;
    }
    from += KEYWORD_PAGE_SIZE;
  }

  return rows;
}

export async function loadWebsiteCollections(supabase: ProcessorSupabase): Promise<WebsiteCollection[]> {
  const { data, error } = await supabase.from('collections').select('id, name, slug');
  if (error) {
    throw new Error(`Could not load website collections: ${error.message}`);
  }

  return ((data ?? []) as WebsiteCollection[]).filter((row) => !MERCHANDISING_SLUGS.has(row.slug));
}

const GENERIC_SLUG_TOKENS = new Set([
  'replica',
  'replicas',
  'watch',
  'watches',
  'iwc',
  'swiss',
  'collection',
  'collections',
  'the',
]);

function slugifyName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function lastUrlSlug(url: string | null | undefined): string {
  if (!url) {
    return '';
  }

  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    return slugifyName(parts.at(-1) ?? '');
  } catch {
    return '';
  }
}

function stripGenericTokens(slug: string): string {
  return slug
    .split('-')
    .filter((token) => token.length > 0 && !GENERIC_SLUG_TOKENS.has(token))
    .join('-');
}

function addSlugKey(keys: Set<string>, value: string) {
  const slug = slugifyName(value);
  if (slug) {
    keys.add(slug);
  }
  const core = stripGenericTokens(slug);
  if (core) {
    keys.add(core);
  }
}

function sourceMatchKeys(sourceName: string | null | undefined, sourceUrl: string | null | undefined): Set<string> {
  const keys = new Set<string>();
  addSlugKey(keys, sourceName ?? '');
  addSlugKey(keys, lastUrlSlug(sourceUrl));
  return keys;
}

function collectionMatchKeys(collection: WebsiteCollection): Set<string> {
  const keys = new Set<string>();
  addSlugKey(keys, collection.slug);
  addSlugKey(keys, collection.name);

  if (collection.slug.endsWith('-series')) {
    addSlugKey(keys, collection.slug.slice(0, -'-series'.length));
  }

  const nameWithoutSeries = collection.name.replace(/\s+series$/i, '').trim();
  if (nameWithoutSeries && nameWithoutSeries !== collection.name) {
    addSlugKey(keys, nameWithoutSeries);
  }

  for (const key of [...keys]) {
    if (key.includes('-') || key.length < 4) {
      continue;
    }
    if (key.endsWith('s')) {
      keys.add(key.slice(0, -1));
    } else {
      keys.add(`${key}s`);
    }
  }

  return keys;
}

function pickBestCollection(matches: WebsiteCollection[]): WebsiteCollection | null {
  if (matches.length === 0) {
    return null;
  }

  return [...matches].sort((left, right) => {
    const bySlug = right.slug.length - left.slug.length;
    return bySlug !== 0 ? bySlug : left.slug.localeCompare(right.slug);
  })[0] ?? null;
}

export function matchWebsiteCollection(
  collections: WebsiteCollection[],
  sourceName: string | null | undefined,
  sourceUrl: string | null | undefined,
): WebsiteCollection | null {
  const haystack = `${sourceName ?? ''} ${sourceUrl ?? ''}`.toLowerCase();
  const sourceSlug = slugifyName(sourceName ?? '');

  const exact = collections.find((collection) => collection.slug === sourceSlug);
  if (exact) {
    return exact;
  }

  const included = collections.filter((collection) => {
    const name = collection.name.toLowerCase();
    const slugTokens = collection.slug.replace(/-/g, ' ');
    return haystack.includes(name) || haystack.includes(collection.slug) || haystack.includes(slugTokens);
  });
  const includedMatch = pickBestCollection(included);
  if (includedMatch) {
    return includedMatch;
  }

  const sourceKeys = sourceMatchKeys(sourceName, sourceUrl);
  const keyed = collections.filter((collection) => {
    const keys = collectionMatchKeys(collection);
    for (const key of sourceKeys) {
      if (keys.has(key)) {
        return true;
      }
    }
    return false;
  });

  return pickBestCollection(keyed);
}

function normalizeKeyword(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function keywordsFromPool(pool: string[], library: GlobalKeyword[]): GlobalKeyword[] {
  const byNormalized = new Map(library.map((row) => [normalizeKeyword(row.keyword), row]));
  const result: GlobalKeyword[] = [];
  const seen = new Set<string>();

  for (const keyword of pool) {
    const key = normalizeKeyword(keyword);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(
      byNormalized.get(key) ?? {
        keyword,
        search_volume: null,
        keyword_difficulty: null,
        intent: null,
        cpc: null,
        position: null,
      },
    );
  }

  return result;
}

export async function planCollectionKeywords(options: {
  provider: ContentAiProvider;
  env: ProcessorEnv;
  keywords: GlobalKeyword[];
  collectionName: string | null;
  collectionUrl: string;
  productTitles: string[];
}): Promise<string[]> {
  if (options.keywords.length === 0) {
    return [];
  }

  const relevant = new Set<string>();
  const batches = chunk(options.keywords, options.env.keywordBatchSize);

  for (const [index, batch] of batches.entries()) {
    const allowed = new Map(batch.map((row) => [normalizeKeyword(row.keyword), row.keyword]));
    const planned = await options.provider.generateJson({
      system:
        'You are the Collection Keyword Planner. Select every keyword from this batch that is relevant to the scraped collection. Keywords without volume, KD, intent, or CPC must still be evaluated equally. Never invent keywords. Return only keywords from the provided batch.',
      user: JSON.stringify({
        collection_name: options.collectionName,
        collection_url: options.collectionUrl,
        sample_product_titles: options.productTitles.slice(0, 40),
        batch_index: index + 1,
        batch_count: batches.length,
        keywords: batch.map((row) => ({
          keyword: row.keyword,
          search_volume: row.search_volume,
          keyword_difficulty: row.keyword_difficulty,
          intent: row.intent,
          cpc: row.cpc,
        })),
      }),
      schemaName: 'collection_keyword_batch',
      validator: collectionKeywordBatchSchema,
      jsonOnlyInstruction:
        'Return ONLY a JSON object of the form {"relevant_keywords":["..."]}. Do not edit files, run commands, or browse the repository.',
    });
    const result = planned.data;

    for (const keyword of result.relevant_keywords) {
      const original = allowed.get(normalizeKeyword(keyword));
      if (original) {
        relevant.add(original);
      }
    }
  }

  return [...relevant];
}
