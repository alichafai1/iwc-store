import { load as loadHtml } from 'cheerio';
import { resolveAdapter } from './adapters/registry.js';
import { uniqueSpecs, type Specification } from './adapters/types.js';
import { loadEnv } from './env.js';
import { errorMessage } from './errors.js';
import { fetchHtml, looksLikeClientRenderedPage } from './fetch-html.js';
import { renderWithPlaywright } from './playwright.js';
import { sleep } from './pool.js';
import { createScraperSupabase, type ScraperSupabase } from './supabase.js';
import { canonicalizeProductUrl } from './url.js';

interface RawCandidate {
  id: string;
  source_url: string;
  source_title: string | null;
  processed_product_id: string | null;
  source_specifications: unknown;
}

interface RepairRow {
  rawId: string;
  productId: string | null;
  sourceUrl: string;
  title: string | null;
  beforeRaw: number;
  afterRaw: number;
  productSpecsWritten: number;
  ok: boolean;
  error?: string;
}

function specCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function isEmptySpecs(value: unknown): boolean {
  return specCount(value) === 0;
}

async function listCandidates(supabase: ScraperSupabase): Promise<RawCandidate[]> {
  const { data: rawRows, error: rawError } = await supabase
    .from('raw_products')
    .select('id, source_url, source_title, processed_product_id, source_specifications')
    .order('source_title');
  if (rawError) {
    throw new Error(rawError.message);
  }

  const rows = (rawRows ?? []) as RawCandidate[];
  const productIds = [...new Set(rows.map((row) => row.processed_product_id).filter(Boolean))] as string[];
  const productsWithSpecs = new Set<string>();

  for (let index = 0; index < productIds.length; index += 200) {
    const chunk = productIds.slice(index, index + 200);
    const { data: specRows, error: specError } = await supabase
      .from('product_specs')
      .select('product_id')
      .in('product_id', chunk);
    if (specError) {
      throw new Error(specError.message);
    }

    for (const row of specRows ?? []) {
      if (row.product_id) {
        productsWithSpecs.add(row.product_id);
      }
    }
  }

  return rows.filter((row) => {
    if (isEmptySpecs(row.source_specifications)) {
      return true;
    }

    return Boolean(row.processed_product_id && !productsWithSpecs.has(row.processed_product_id));
  });
}

async function extractSpecifications(url: string, timeoutMs: number): Promise<Specification[]> {
  const parsedUrl = canonicalizeProductUrl(url);
  const adapter = resolveAdapter(parsedUrl);
  let page = await fetchHtml(parsedUrl, timeoutMs);
  let $ = loadHtml(page.html);
  let draft = adapter.extract({ url: page.finalUrl, html: page.html, $ });

  if (!draft.title || looksLikeClientRenderedPage(page.html)) {
    page = await renderWithPlaywright(parsedUrl);
    $ = loadHtml(page.html);
    draft = adapter.extract({ url: page.finalUrl, html: page.html, $ });
  }

  return uniqueSpecs([
    ...draft.primarySpecs,
    ...draft.specifications,
    ...draft.additionalInformation,
  ]);
}

async function replaceProductSpecs(
  supabase: ScraperSupabase,
  productId: string,
  specifications: Specification[],
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

async function repairOne(
  supabase: ScraperSupabase,
  candidate: RawCandidate,
  timeoutMs: number,
): Promise<RepairRow> {
  const beforeRaw = specCount(candidate.source_specifications);
  const result: RepairRow = {
    rawId: candidate.id,
    productId: candidate.processed_product_id,
    sourceUrl: candidate.source_url,
    title: candidate.source_title,
    beforeRaw,
    afterRaw: beforeRaw,
    productSpecsWritten: 0,
    ok: false,
  };

  try {
    const specifications = await extractSpecifications(candidate.source_url, timeoutMs);
    result.afterRaw = specifications.length;

    if (specifications.length > 0) {
      const { error } = await supabase
        .from('raw_products')
        .update({
          source_specifications: specifications,
          source_primary_specs: specifications,
          source_additional_information: specifications,
        })
        .eq('id', candidate.id);
      if (error) {
        throw new Error(error.message);
      }
    }

    if (candidate.processed_product_id && specifications.length > 0) {
      await replaceProductSpecs(supabase, candidate.processed_product_id, specifications);
      result.productSpecsWritten = specifications.length;
    }

    result.ok = specifications.length > 0;
    return result;
  } catch (error) {
    result.error = errorMessage(error);
    return result;
  }
}

const env = loadEnv();
const supabase = createScraperSupabase(env);
const candidates = await listCandidates(supabase);
const rows: RepairRow[] = [];

for (const [index, candidate] of candidates.entries()) {
  const row = await repairOne(supabase, candidate, env.fetchTimeoutMs);
  rows.push(row);
  const status = row.ok ? `fixed ${row.afterRaw}` : row.error ? `error ${row.error}` : 'still missing';
  console.error(`[${index + 1}/${candidates.length}] ${candidate.source_title ?? candidate.source_url}: ${status}`);
  if (index < candidates.length - 1) {
    await sleep(env.delayMs);
  }
}

const fixed = rows.filter((row) => row.ok);
const missing = rows.filter((row) => !row.ok);
const report = {
  candidates: rows.length,
  fixed: fixed.length,
  stillMissing: missing.length,
  fixedProducts: fixed.map((row) => ({
    title: row.title,
    sourceUrl: row.sourceUrl,
    productId: row.productId,
    before: row.beforeRaw,
    after: row.afterRaw,
  })),
  stillMissingProducts: missing.map((row) => ({
    title: row.title,
    sourceUrl: row.sourceUrl,
    productId: row.productId,
    error: row.error ?? null,
  })),
};

console.log(JSON.stringify(report, null, 2));
