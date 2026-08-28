import { load as loadHtml } from 'cheerio';
import { resolveAdapter } from './adapters/registry.js';
import { omitReviewFields } from './adapters/extract/kv.js';
import { fetchHtml, looksLikeClientRenderedPage } from './fetch-html.js';
import { renderWithPlaywright } from './playwright.js';
import { upsertRawProduct, type CollectionContext, type RawProductRow } from './persist.js';
import { normalizedProductSchema, type NormalizedProduct } from './schemas.js';
import type { ScraperSupabase } from './supabase.js';
import { errorMessage, ScraperError, UnsupportedPageError } from './errors.js';
import { canonicalizeProductUrl, sourceDomain } from './url.js';
import type { ScraperEnv } from './env.js';
import type { AdapterDraft } from './adapters/types.js';

export interface ScrapeSuccess {
  ok: true;
  id: string;
  product: NormalizedProduct;
  renderer: 'fetch' | 'playwright';
  adapter: string;
}

export interface ScrapeFailure {
  ok: false;
  id?: string;
  error: string;
  code: string;
  statusCode: number;
}

export type ScrapeResult = ScrapeSuccess | ScrapeFailure;

function needsPlaywright(html: string, title?: string): boolean {
  return !title || looksLikeClientRenderedPage(html);
}

function toNormalized(url: URL, draft: AdapterDraft, extraRaw: Record<string, unknown>): NormalizedProduct {
  if (!draft.title) {
    throw new UnsupportedPageError();
  }

  const primarySpecs = draft.primarySpecs.length ? draft.primarySpecs : draft.specifications;

  return normalizedProductSchema.parse({
    source_url: url.toString(),
    source_domain: sourceDomain(url),
    title: draft.title,
    description: draft.description ?? null,
    price: draft.price ?? null,
    currency: draft.currency ?? null,
    breadcrumbs: draft.breadcrumbs,
    specifications: draft.specifications,
    features: draft.features,
    collection_url: draft.collectionUrl ?? null,
    collection_name: draft.collectionName ?? null,
    model: draft.model ?? null,
    brand: draft.brand ?? null,
    category: draft.category ?? null,
    primary_specs: primarySpecs,
    additional_information: draft.additionalInformation,
    raw_data: omitReviewFields({ ...draft.raw, ...extraRaw }),
  });
}

export async function scrapeProduct(input: {
  url: string;
  env: ScraperEnv;
  supabase: ScraperSupabase;
  collection?: CollectionContext;
}): Promise<ScrapeResult> {
  let parsedUrl: URL;

  try {
    parsedUrl = canonicalizeProductUrl(input.url);
  } catch (error) {
    return toFailure(error);
  }

  const adapter = resolveAdapter(parsedUrl);
  let renderer: 'fetch' | 'playwright' = 'fetch';

  try {
    let page = await fetchHtml(parsedUrl, input.env.fetchTimeoutMs);
    let $ = loadHtml(page.html);
    let draft = adapter.extract({ url: page.finalUrl, html: page.html, $ });

    if (needsPlaywright(page.html, draft.title)) {
      page = await renderWithPlaywright(parsedUrl);
      renderer = 'playwright';
      $ = loadHtml(page.html);
      draft = adapter.extract({ url: page.finalUrl, html: page.html, $ });
    }

    if (input.collection) {
      draft.collectionUrl = input.collection.collectionUrl;
      draft.collectionName = input.collection.collectionName ?? draft.collectionName;
    }

    const canonicalUrl = canonicalizeProductUrl(page.finalUrl.toString());
    const product = toNormalized(canonicalUrl, draft, {
      adapter: adapter.id,
      renderer,
      http_status: page.status,
    });

    const row = await upsertRawProduct(input.supabase, {
      product,
      sourceUrl: parsedUrl.toString(),
      sourceDomain: sourceDomain(parsedUrl),
      status: 'scraped',
      collection: input.collection,
    });

    return {
      ok: true,
      id: row.id,
      product,
      renderer,
      adapter: adapter.id,
    };
  } catch (error) {
    const failure = toFailure(error);
    let row: RawProductRow | undefined;

    try {
      row = await upsertRawProduct(input.supabase, {
        sourceUrl: parsedUrl.toString(),
        sourceDomain: sourceDomain(parsedUrl),
        status: 'failed',
        errorMessage: failure.error,
        collection: input.collection,
      });
    } catch (persistError) {
      failure.error = `${failure.error} (also failed to save: ${errorMessage(persistError)})`;
    }

    return {
      ...failure,
      id: row?.id,
    };
  }
}

function toFailure(error: unknown): ScrapeFailure {
  if (error instanceof ScraperError) {
    return {
      ok: false,
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  return {
    ok: false,
    error: errorMessage(error),
    code: 'scrape_failed',
    statusCode: 500,
  };
}
