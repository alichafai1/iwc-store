import { errorMessage, isTransientDbError, ProcessorError } from './errors.js';
import type { ProcessorEnv } from './env.js';
import { generateProductDraft, type RawProductRow } from './generate.js';
import {
  keywordsFromPool,
  loadAllGlobalKeywords,
  loadWebsiteCollections,
  matchWebsiteCollection,
  planCollectionKeywords,
} from './keywords.js';
import { createContentAiProvider } from './providers/index.js';
import type { ContentAiProvider } from './providers/types.js';
import { mapPool } from './pool.js';
import { refreshJobCounts, saveDraftProduct } from './persist.js';
import type { ProcessorSupabase } from './supabase.js';

const runningJobs = new Set<string>();

const ABANDONED_RUN_MESSAGE =
  '[stopped] AI processing was abandoned after the worker died.';
const ABANDONED_JOB_MESSAGE =
  'AI processing stopped because the worker died. Resume to retry failed and pending products. Completed drafts were not changed.';

export function listRunningProcessingJobIds(): string[] {
  return [...runningJobs];
}

function isJobLive(jobId: string): boolean {
  return runningJobs.has(jobId);
}

export async function recoverAbandonedJob(
  supabase: ProcessorSupabase,
  jobId: string,
): Promise<{ recovered: boolean; abandonedRuns: number }> {
  if (isJobLive(jobId)) {
    return { recovered: false, abandonedRuns: 0 };
  }

  const { data: job, error: jobError } = await supabase
    .from('ai_processing_jobs')
    .select('id, status')
    .eq('id', jobId)
    .maybeSingle();
  if (jobError) {
    throw new Error(jobError.message);
  }
  if (!job || job.status !== 'processing') {
    return { recovered: false, abandonedRuns: 0 };
  }

  const { data: abandoned, error: runError } = await supabase
    .from('ai_product_runs')
    .update({
      status: 'failed',
      error_message: ABANDONED_RUN_MESSAGE,
      completed_at: new Date().toISOString(),
    })
    .eq('processing_job_id', jobId)
    .eq('status', 'processing')
    .select('id');
  if (runError) {
    throw new Error(runError.message);
  }

  await refreshJobCounts(supabase, jobId);

  const { data: counts, error: countError } = await supabase
    .from('ai_processing_jobs')
    .select('processed_products, failed_products')
    .eq('id', jobId)
    .single();
  if (countError) {
    throw new Error(countError.message);
  }

  const failed = counts?.failed_products ?? 0;
  const processed = counts?.processed_products ?? 0;
  const status = failed > 0 ? 'completed_with_errors' : processed > 0 ? 'completed' : 'failed';

  const { error: updateError } = await supabase
    .from('ai_processing_jobs')
    .update({
      status,
      completed_at: new Date().toISOString(),
      error_message: ABANDONED_JOB_MESSAGE,
    })
    .eq('id', jobId)
    .eq('status', 'processing');
  if (updateError) {
    throw new Error(updateError.message);
  }

  console.info(
    `[ai] recovered stale job=${jobId} abandoned_runs=${abandoned?.length ?? 0} status=${status}`,
  );
  return { recovered: true, abandonedRuns: abandoned?.length ?? 0 };
}

export async function recoverStaleProcessingJobs(
  supabase: ProcessorSupabase,
): Promise<string[]> {
  const { data: jobs, error } = await supabase
    .from('ai_processing_jobs')
    .select('id')
    .eq('status', 'processing');
  if (error) {
    throw new Error(error.message);
  }

  const recovered: string[] = [];
  for (const job of jobs ?? []) {
    const result = await recoverAbandonedJob(supabase, job.id);
    if (result.recovered) {
      recovered.push(job.id);
    }
  }
  return recovered;
}

export async function recoverAndResumeStaleProcessingJobs(
  supabase: ProcessorSupabase,
  env: ProcessorEnv,
): Promise<string[]> {
  const recovered = await recoverStaleProcessingJobs(supabase);
  const { data: crashed, error } = await supabase
    .from('ai_processing_jobs')
    .select('id, status, error_message')
    .in('status', ['failed', 'completed_with_errors']);
  if (error) {
    throw new Error(error.message);
  }

  const extra = (crashed ?? [])
    .filter((job) => {
      if (job.status === 'failed') {
        return true;
      }
      const message = (job.error_message ?? '').toLowerCase();
      return message.includes('jwt issued at future') || message.includes('worker died');
    })
    .map((job) => job.id);

  const resumed: string[] = [];
  for (const jobId of [...new Set([...recovered, ...extra])]) {
    const result = await retryFailedProducts({
      processingJobId: jobId,
      env,
      supabase,
    });
    if (result.ok) {
      resumed.push(jobId);
      console.info(`[ai] resumed stale job=${jobId} status=${result.status}`);
      continue;
    }
    console.error(`[ai] resume failed job=${jobId}: ${result.error}`);
  }
  return resumed;
}

export interface ProcessStartResult {
  ok: true;
  processingJobId: string;
  status: string;
  totalProducts: number;
  reused: boolean;
}

export interface ProcessFailure {
  ok: false;
  error: string;
  code: string;
  statusCode: number;
  processingJobId?: string;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function loadScrapedProducts(supabase: ProcessorSupabase, scrapeJobId: string): Promise<RawProductRow[]> {
  const { data, error } = await supabase
    .from('raw_products')
    .select(
      'id, processed_product_id, scrape_status, source_url, source_title, source_description, source_price, source_currency, source_model, source_brand, source_category, source_collection_name, source_collection_url, source_specifications, source_primary_specs, source_additional_information, source_features, raw_data',
    )
    .eq('scrape_job_id', scrapeJobId)
    .in('scrape_status', ['scraped', 'processed'])
    .order('source_title', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as RawProductRow[];
}

async function upsertRun(
  supabase: ProcessorSupabase,
  processingJobId: string,
  rawProductId: string,
): Promise<string> {
  const { data: existing, error: existingError } = await supabase
    .from('ai_product_runs')
    .select('id')
    .eq('processing_job_id', processingJobId)
    .eq('raw_product_id', rawProductId)
    .maybeSingle();
  if (existingError) {
    throw new Error(existingError.message);
  }
  if (existing?.id) {
    return existing.id;
  }

  const { data, error } = await supabase
    .from('ai_product_runs')
    .insert({
      processing_job_id: processingJobId,
      raw_product_id: rawProductId,
      status: 'pending',
    })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? 'Could not create an AI product run.');
  }
  return data.id;
}

async function processOneProduct(options: {
  provider: ContentAiProvider;
  env: ProcessorEnv;
  supabase: ProcessorSupabase;
  jobId: string;
  raw: RawProductRow;
  productKeywords: ReturnType<typeof keywordsFromPool>;
  allowedCollections: Awaited<ReturnType<typeof loadWebsiteCollections>>;
  collection: { id: string; name: string; slug: string };
}) {
  const runId = await upsertRun(options.supabase, options.jobId, options.raw.id);
  await options.supabase
    .from('ai_product_runs')
    .update({
      status: 'processing',
      error_message: null,
      attempts: 0,
    })
    .eq('id', runId);

  try {
    const draft = await generateProductDraft({
      provider: options.provider,
      raw: options.raw,
      productKeywords: options.productKeywords,
      allowedCollections: options.allowedCollections,
      collectionSlug: options.collection.slug,
    });

    const chosenSlug = draft.generated.product.collection_slugs[0];
    const collection =
      options.allowedCollections.find((item) => item.slug === chosenSlug) ?? options.collection;

    const productId = await saveDraftProduct({
      supabase: options.supabase,
      raw: options.raw,
      generated: draft.generated,
      coverage: draft.coverage,
      collection,
    });

    const { error } = await options.supabase
      .from('ai_product_runs')
      .update({
        status: 'completed',
        product_id: productId,
        primary_keyword: draft.generated.keyword_strategy.primary_keyword || null,
        selected_keywords: [
          draft.generated.keyword_strategy.primary_keyword,
          ...draft.generated.keyword_strategy.secondary_keywords,
          ...draft.generated.keyword_strategy.supporting_keywords,
        ].filter(Boolean),
        used_keywords: draft.coverage.usedKeywords,
        unused_relevant_keywords: draft.coverage.unusedKeywords,
        coverage_percent: draft.coverage.coveragePercent,
        attempts: draft.attempts,
        final_output: draft.generated,
        error_message: null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);
    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    const code = error instanceof ProcessorError ? error.code : '';
    await options.supabase
      .from('ai_product_runs')
      .update({
        status: 'failed',
        error_message: code ? `[${code}] ${errorMessage(error)}` : errorMessage(error),
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);
    if (code === 'cursor_usage_limit') {
      throw error;
    }
  } finally {
    await refreshJobCounts(options.supabase, options.jobId);
  }
}

async function runJob(options: {
  env: ProcessorEnv;
  supabase: ProcessorSupabase;
  jobId: string;
  scrapeJobId: string;
  retryFailedOnly: boolean;
  retryRawProductId?: string;
  reprocessExisting?: boolean;
}) {
  const { supabase, jobId } = options;
  runningJobs.add(jobId);

  try {
    const { data: job, error: jobError } = await supabase
      .from('ai_processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    if (jobError || !job) {
      throw new Error(jobError?.message ?? 'Processing job not found.');
    }

    await supabase
      .from('ai_processing_jobs')
      .update({
        status: 'processing',
        started_at: job.started_at ?? new Date().toISOString(),
        error_message: null,
        completed_at: null,
      })
      .eq('id', jobId);

    const scraped = await loadScrapedProducts(supabase, options.scrapeJobId);
    if (scraped.length === 0) {
      throw new Error('No successfully scraped products are available to process.');
    }

    const collections = await loadWebsiteCollections(supabase);
    const collection = matchWebsiteCollection(
      collections,
      job.collection_name,
      job.collection_url,
    );
    if (!collection) {
      throw new Error(
        `No matching website collection for "${job.collection_name ?? job.collection_url}". Existing collections were not changed.`,
      );
    }

    const provider = await createContentAiProvider(options.env);
    console.info(`[ai] provider=${provider.name} model=${provider.model} job=${jobId}`);
    let collectionKeywords = Array.isArray(job.collection_keywords)
      ? job.collection_keywords.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];

    const keywords = await loadAllGlobalKeywords(supabase);
    await supabase
      .from('ai_processing_jobs')
      .update({
        keywords_evaluated: keywords.length,
        total_products: scraped.length,
      })
      .eq('id', jobId);

    if (collectionKeywords.length === 0) {
      collectionKeywords = await planCollectionKeywords({
        provider,
        env: options.env,
        keywords,
        collectionName: job.collection_name,
        collectionUrl: job.collection_url,
        productTitles: scraped.map((row) => row.source_title).filter((value): value is string => Boolean(value)),
      });
      await supabase
        .from('ai_processing_jobs')
        .update({ collection_keywords: collectionKeywords })
        .eq('id', jobId);
    }

    let targets = scraped;
    const { data: existingRuns, error: existingRunsError } = await supabase
      .from('ai_product_runs')
      .select('raw_product_id, status')
      .eq('processing_job_id', jobId);
    if (existingRunsError) {
      throw new Error(existingRunsError.message);
    }
    const completedIds = new Set(
      (existingRuns ?? []).filter((row) => row.status === 'completed').map((row) => row.raw_product_id),
    );

    if (options.retryFailedOnly) {
      targets = scraped.filter((row) => {
        if (completedIds.has(row.id)) {
          return false;
        }
        if (options.retryRawProductId) {
          return row.id === options.retryRawProductId;
        }
        return true;
      });
    } else if (!options.reprocessExisting) {
      targets = scraped.filter((row) => !completedIds.has(row.id));
    }

    const productKeywords = keywordsFromPool(collectionKeywords, keywords);

    let stopError: unknown = null;
    await mapPool(
      targets,
      options.env.concurrency,
      async (raw) => {
        if (stopError) {
          return;
        }
        try {
          await processOneProduct({
            provider,
            env: options.env,
            supabase,
            jobId,
            raw,
            productKeywords,
            allowedCollections: collections,
            collection,
          });
        } catch (error) {
          if (error instanceof ProcessorError && error.code === 'cursor_usage_limit') {
            stopError = error;
            return;
          }
          console.error(
            `[ai] product ${raw.id} hit a non-fatal worker error; continuing: ${errorMessage(error)}`,
          );
        }
      },
      () => Boolean(stopError),
    );
    if (stopError) {
      throw stopError;
    }

    const { data: finalJob } = await supabase
      .from('ai_processing_jobs')
      .select('processed_products, failed_products, total_products')
      .eq('id', jobId)
      .single();
    const failed = finalJob?.failed_products ?? 0;
    const processed = finalJob?.processed_products ?? 0;
    const status = failed > 0 ? 'completed_with_errors' : processed > 0 ? 'completed' : 'failed';

    await supabase
      .from('ai_processing_jobs')
      .update({
        status,
        completed_at: new Date().toISOString(),
        error_message: failed > 0 ? `${failed} product${failed === 1 ? '' : 's'} failed AI processing.` : null,
      })
      .eq('id', jobId);
  } catch (error) {
    const crashed = isTransientDbError(error);
    await supabase
      .from('ai_processing_jobs')
      .update({
        status: crashed ? 'completed_with_errors' : 'failed',
        completed_at: new Date().toISOString(),
        error_message: errorMessage(error),
      })
      .eq('id', jobId);
  } finally {
    runningJobs.delete(jobId);
  }
}

export async function startCollectionProcessing(options: {
  scrapeJobId: string;
  env: ProcessorEnv;
  supabase: ProcessorSupabase;
  retryFailed?: boolean;
  retryRawProductId?: string;
  reprocessExisting?: boolean;
}): Promise<ProcessStartResult | ProcessFailure> {
  if (!isUuid(options.scrapeJobId)) {
    return { ok: false, error: 'A valid scrape job id is required.', code: 'invalid_request', statusCode: 400 };
  }

  const { data: scrapeJob, error: scrapeError } = await options.supabase
    .from('scrape_jobs')
    .select('id, source_collection_url, source_collection_name, job_status, products_completed')
    .eq('id', options.scrapeJobId)
    .maybeSingle();

  if (scrapeError) {
    return {
      ok: false,
      error: /fetch failed/i.test(scrapeError.message)
        ? 'The product processor could not reach the database. Restart npm run dev and try again.'
        : scrapeError.message,
      code: 'database_error',
      statusCode: 500,
    };
  }
  if (!scrapeJob) {
    return { ok: false, error: 'That scrape job was not found.', code: 'not_found', statusCode: 404 };
  }
  if (scrapeJob.job_status === 'running' || scrapeJob.job_status === 'pending') {
    return {
      ok: false,
      error: 'Wait until the collection scrape finishes before AI processing starts.',
      code: 'scrape_in_progress',
      statusCode: 409,
    };
  }
  if ((scrapeJob.products_completed ?? 0) < 1 && scrapeJob.job_status !== 'completed') {
    return {
      ok: false,
      error: 'This scrape job has no successfully scraped products.',
      code: 'no_products',
      statusCode: 422,
    };
  }

  const { data: existing } = await options.supabase
    .from('ai_processing_jobs')
    .select('id, status, total_products')
    .eq('scrape_job_id', options.scrapeJobId)
    .maybeSingle();

  if (existing && existing.status === 'processing' && isJobLive(existing.id)) {
    return {
      ok: true,
      processingJobId: existing.id,
      status: existing.status,
      totalProducts: existing.total_products,
      reused: true,
    };
  }

  if (existing && existing.status === 'processing' && !isJobLive(existing.id)) {
    await recoverAbandonedJob(options.supabase, existing.id);
    existing.status = 'completed_with_errors';
  }

  let jobId = existing?.id;
  if (!jobId) {
    const { data: created, error: createError } = await options.supabase
      .from('ai_processing_jobs')
      .insert({
        scrape_job_id: options.scrapeJobId,
        collection_url: scrapeJob.source_collection_url,
        collection_name: scrapeJob.source_collection_name,
        status: 'pending',
        total_products: scrapeJob.products_completed ?? 0,
      })
      .select('id, total_products, status')
      .single();
    if (createError || !created) {
      return {
        ok: false,
        error: createError?.message ?? 'Could not create the AI processing job.',
        code: 'database_error',
        statusCode: 500,
      };
    }
    jobId = created.id;
  }

  if (isJobLive(jobId) && !options.retryFailed && !options.reprocessExisting) {
    return {
      ok: true,
      processingJobId: jobId,
      status: 'processing',
      totalProducts: existing?.total_products ?? scrapeJob.products_completed ?? 0,
      reused: true,
    };
  }

  if (
    existing &&
    (existing.status === 'completed' || existing.status === 'completed_with_errors') &&
    !options.retryFailed &&
    !options.reprocessExisting
  ) {
    const { count: scrapedCount } = await options.supabase
      .from('raw_products')
      .select('id', { count: 'exact', head: true })
      .eq('scrape_job_id', options.scrapeJobId)
      .eq('scrape_status', 'scraped');
    const { count: completedCount } = await options.supabase
      .from('ai_product_runs')
      .select('id', { count: 'exact', head: true })
      .eq('processing_job_id', jobId)
      .eq('status', 'completed');
    if ((scrapedCount ?? 0) <= (completedCount ?? 0)) {
      return {
        ok: true,
        processingJobId: jobId,
        status: existing.status,
        totalProducts: existing.total_products,
        reused: true,
      };
    }
  }

  void runJob({
    env: options.env,
    supabase: options.supabase,
    jobId,
    scrapeJobId: options.scrapeJobId,
    retryFailedOnly: Boolean(options.retryFailed),
    retryRawProductId: options.retryRawProductId,
    reprocessExisting: Boolean(options.reprocessExisting),
  });

  return {
    ok: true,
    processingJobId: jobId,
    status: 'processing',
    totalProducts: existing?.total_products ?? scrapeJob.products_completed ?? 0,
    reused: Boolean(existing),
  };
}

export async function retryFailedProducts(options: {
  processingJobId: string;
  env: ProcessorEnv;
  supabase: ProcessorSupabase;
  rawProductId?: string;
}): Promise<ProcessStartResult | ProcessFailure> {
  if (!isUuid(options.processingJobId)) {
    return { ok: false, error: 'A valid processing job id is required.', code: 'invalid_request', statusCode: 400 };
  }

  const { data: job, error } = await options.supabase
    .from('ai_processing_jobs')
    .select('id, scrape_job_id, status, total_products')
    .eq('id', options.processingJobId)
    .maybeSingle();
  if (error) {
    return { ok: false, error: error.message, code: 'database_error', statusCode: 500 };
  }
  if (!job) {
    return { ok: false, error: 'That AI processing job was not found.', code: 'not_found', statusCode: 404 };
  }
  if (job.status === 'processing' && isJobLive(job.id)) {
    return {
      ok: true,
      processingJobId: job.id,
      status: 'processing',
      totalProducts: job.total_products,
      reused: true,
    };
  }

  if (job.status === 'processing' && !isJobLive(job.id)) {
    await recoverAbandonedJob(options.supabase, job.id);
  }

  if (options.rawProductId && !isUuid(options.rawProductId)) {
    return { ok: false, error: 'A valid raw product id is required.', code: 'invalid_request', statusCode: 400 };
  }

  return startCollectionProcessing({
    scrapeJobId: job.scrape_job_id,
    env: options.env,
    supabase: options.supabase,
    retryFailed: true,
    retryRawProductId: options.rawProductId,
  });
}
