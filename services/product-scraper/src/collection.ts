import { load as loadHtml } from 'cheerio';
import { resolveCollectionAdapter } from './adapters/registry.js';
import type { DiscoveredProduct } from './adapters/types.js';
import { errorMessage, ScraperError, UnsupportedPageError } from './errors.js';
import { fetchHtml, looksLikeClientRenderedPage } from './fetch-html.js';
import { renderWithPlaywright } from './playwright.js';
import {
  createScrapeJob,
  getScrapeJob,
  listJobProductUrls,
  refreshJobCounts,
  updateScrapeJob,
  upsertRawProduct,
  type CollectionContext,
  type ScrapeJobRow,
} from './persist.js';
import { mapPool, sleep, withRetries } from './pool.js';
import { scrapeProduct } from './scrape.js';
import type { ScraperEnv } from './env.js';
import type { ScraperSupabase } from './supabase.js';
import { canonicalizeProductUrl, sourceDomain } from './url.js';

const MAX_COLLECTION_PAGES = 40;
const runningJobs = new Set<string>();

export interface CollectionJobAccepted {
  ok: true;
  jobId: string;
  collectionName: string | null;
  discovered: number;
  status: 'running';
}

export interface CollectionJobFailure {
  ok: false;
  jobId?: string;
  error: string;
  code: string;
  statusCode: number;
}

export type CollectionJobStartResult = CollectionJobAccepted | CollectionJobFailure;

async function loadCollectionPage(url: URL, env: ScraperEnv) {
  let page = await fetchHtml(url, env.fetchTimeoutMs);
  let $ = loadHtml(page.html);
  const adapter = resolveCollectionAdapter(page.finalUrl) ?? resolveCollectionAdapter(url);
  if (!adapter) {
    throw new UnsupportedPageError('Collection scraping is not supported for this website yet.');
  }

  let extracted = adapter.extractCollection({ url: page.finalUrl, html: page.html, $ });
  if (extracted.products.length === 0 && looksLikeClientRenderedPage(page.html)) {
    page = await renderWithPlaywright(url);
    $ = loadHtml(page.html);
    extracted = adapter.extractCollection({ url: page.finalUrl, html: page.html, $ });
  }

  return { adapter, page, extracted };
}

async function discoverCollection(url: URL, env: ScraperEnv): Promise<{
  collectionName?: string;
  products: DiscoveredProduct[];
}> {
  const seen = new Map<string, DiscoveredProduct>();
  const queued = [canonicalizeProductUrl(url.toString())];
  const visited = new Set<string>();
  let collectionName: string | undefined;

  while (queued.length > 0 && visited.size < MAX_COLLECTION_PAGES) {
    const pageUrl = queued.shift();
    if (!pageUrl) {
      break;
    }

    const key = pageUrl.toString();
    if (visited.has(key)) {
      continue;
    }

    visited.add(key);
    if (visited.size > 1) {
      await sleep(env.delayMs);
    }

    const { extracted } = await loadCollectionPage(pageUrl, env);
    collectionName = collectionName ?? extracted.collectionName;
    for (const product of extracted.products) {
      if (!seen.has(product.url)) {
        seen.set(product.url, product);
      }
    }

    for (const next of extracted.nextPageUrls) {
      try {
        const nextUrl = canonicalizeProductUrl(next);
        if (!visited.has(nextUrl.toString()) && !queued.some((item) => item.toString() === nextUrl.toString())) {
          queued.push(nextUrl);
        }
      } catch {
        // Ignore malformed pagination links.
      }
    }
  }

  return {
    collectionName,
    products: [...seen.values()],
  };
}

async function persistDiscovered(
  supabase: ScraperSupabase,
  collection: CollectionContext,
  sourceDomainName: string,
  products: DiscoveredProduct[],
): Promise<void> {
  for (const product of products) {
    await upsertRawProduct(supabase, {
      sourceUrl: product.url,
      sourceDomain: sourceDomainName,
      status: 'pending',
      collection,
      product: product.title
        ? {
            source_url: product.url,
            source_domain: sourceDomainName,
            title: product.title,
            description: null,
            price: product.price ?? null,
            currency: product.currency ?? null,
            breadcrumbs: [],
            specifications: [],
            features: [],
            collection_url: collection.collectionUrl,
            collection_name: collection.collectionName ?? null,
            model: null,
            brand: null,
            category: null,
            primary_specs: [],
            additional_information: [],
            raw_data: { list_title: product.title, list_price: product.price ?? null },
          }
        : undefined,
    });
  }
}

async function scrapeUrls(input: {
  urls: string[];
  env: ScraperEnv;
  supabase: ScraperSupabase;
  collection: CollectionContext;
}): Promise<void> {
  await mapPool(input.urls, input.env.concurrency, async (url) => {
    await sleep(input.env.delayMs);
    await withRetries(
      input.env.maxAttempts,
      input.env.delayMs,
      async () => {
        const result = await scrapeProduct({
          url,
          env: input.env,
          supabase: input.supabase,
          collection: input.collection,
        });

        if (!result.ok && (result.code === 'fetch_failed' || result.code === 'timeout')) {
          throw new ScraperError(result.error, { statusCode: result.statusCode, code: result.code });
        }

        return result;
      },
      (error) => error instanceof ScraperError && (error.code === 'fetch_failed' || error.code === 'timeout'),
    ).catch(async (error) => {
      await upsertRawProduct(input.supabase, {
        sourceUrl: url,
        sourceDomain: sourceDomain(new URL(url)),
        status: 'failed',
        errorMessage: errorMessage(error),
        collection: input.collection,
      });
    });

    await refreshJobCounts(input.supabase, input.collection.jobId);
  });
}

async function finishJob(supabase: ScraperSupabase, jobId: string, errorMessageText?: string): Promise<void> {
  await refreshJobCounts(supabase, jobId);
  await updateScrapeJob(supabase, jobId, {
    job_status: errorMessageText ? 'failed' : 'completed',
    error_message: errorMessageText ?? null,
    completed_at: new Date().toISOString(),
  });
}

async function runProductBatch(input: {
  urls: string[];
  env: ScraperEnv;
  supabase: ScraperSupabase;
  collection: CollectionContext;
}): Promise<void> {
  if (runningJobs.has(input.collection.jobId)) {
    return;
  }

  runningJobs.add(input.collection.jobId);
  try {
    await scrapeUrls(input);
    await finishJob(input.supabase, input.collection.jobId);
  } catch (error) {
    await finishJob(input.supabase, input.collection.jobId, errorMessage(error));
  } finally {
    runningJobs.delete(input.collection.jobId);
  }
}

export async function startCollectionScrape(input: {
  url: string;
  env: ScraperEnv;
  supabase: ScraperSupabase;
  wait?: boolean;
}): Promise<CollectionJobStartResult> {
  let collectionUrl: URL;

  try {
    collectionUrl = canonicalizeProductUrl(input.url);
  } catch (error) {
    return toFailure(error);
  }

  if (!resolveCollectionAdapter(collectionUrl)) {
    return {
      ok: false,
      error: 'Collection scraping is not supported for this website yet.',
      code: 'unsupported_collection',
      statusCode: 422,
    };
  }

  let job: ScrapeJobRow | undefined;

  try {
    const discovered = await discoverCollection(collectionUrl, input.env);
    job = await createScrapeJob(input.supabase, {
      collectionUrl: collectionUrl.toString(),
      collectionName: discovered.collectionName ?? null,
      sourceDomain: sourceDomain(collectionUrl),
    });

    if (discovered.products.length === 0) {
      await updateScrapeJob(input.supabase, job.id, {
        job_status: 'failed',
        error_message: 'No product URLs were found in this collection.',
        completed_at: new Date().toISOString(),
      });

      return {
        ok: false,
        jobId: job.id,
        error: 'No product URLs were found in this collection.',
        code: 'no_products',
        statusCode: 422,
      };
    }

    const collection: CollectionContext = {
      jobId: job.id,
      collectionUrl: collectionUrl.toString(),
      collectionName: discovered.collectionName ?? null,
    };

    await persistDiscovered(input.supabase, collection, sourceDomain(collectionUrl), discovered.products);
    await updateScrapeJob(input.supabase, job.id, {
      source_collection_name: discovered.collectionName ?? null,
      products_discovered: discovered.products.length,
    });

    const batch = runProductBatch({
      urls: discovered.products.map((product) => product.url),
      env: input.env,
      supabase: input.supabase,
      collection,
    });

    if (input.wait) {
      await batch;
    } else {
      void batch;
    }

    return {
      ok: true,
      jobId: job.id,
      collectionName: discovered.collectionName ?? null,
      discovered: discovered.products.length,
      status: 'running',
    };
  } catch (error) {
    if (job) {
      try {
        await finishJob(input.supabase, job.id, errorMessage(error));
      } catch {
        // The original error is more useful to the caller.
      }
    }

    return toFailure(error, job?.id);
  }
}

export async function retryFailedProducts(input: {
  jobId: string;
  env: ScraperEnv;
  supabase: ScraperSupabase;
  wait?: boolean;
}): Promise<CollectionJobStartResult> {
  try {
    const job = await getScrapeJob(input.supabase, input.jobId);
    if (!job) {
      return {
        ok: false,
        error: 'That scrape job was not found.',
        code: 'job_not_found',
        statusCode: 404,
      };
    }

    if (runningJobs.has(job.id)) {
      return {
        ok: false,
        jobId: job.id,
        error: 'This collection scrape is still running.',
        code: 'job_running',
        statusCode: 409,
      };
    }

    const urls = await listJobProductUrls(input.supabase, job.id, 'failed');
    if (urls.length === 0) {
      return {
        ok: false,
        jobId: job.id,
        error: 'There are no failed products to retry.',
        code: 'no_failed_products',
        statusCode: 422,
      };
    }

    await updateScrapeJob(input.supabase, job.id, {
      job_status: 'running',
      error_message: null,
      completed_at: null,
    });

    const collection: CollectionContext = {
      jobId: job.id,
      collectionUrl: job.source_collection_url,
      collectionName: job.source_collection_name,
    };

    const batch = runProductBatch({
      urls,
      env: input.env,
      supabase: input.supabase,
      collection,
    });

    if (input.wait) {
      await batch;
    } else {
      void batch;
    }

    return {
      ok: true,
      jobId: job.id,
      collectionName: job.source_collection_name,
      discovered: job.products_discovered,
      status: 'running',
    };
  } catch (error) {
    return toFailure(error, input.jobId);
  }
}

function toFailure(error: unknown, jobId?: string): CollectionJobFailure {
  if (error instanceof ScraperError) {
    return {
      ok: false,
      jobId,
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  return {
    ok: false,
    jobId,
    error: errorMessage(error),
    code: 'collection_scrape_failed',
    statusCode: 500,
  };
}
