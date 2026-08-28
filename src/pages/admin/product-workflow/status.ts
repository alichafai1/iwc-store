export const prerender = false;

import type { APIRoute } from 'astro';
import { getAiJobByScrapeJob, listAiRunsByJob } from '../../../lib/admin/ai-jobs';
import { isUuid } from '../../../lib/admin/query';
import { listRawProductsByJob } from '../../../lib/admin/raw-products';
import { getScrapeJob, jobRemaining } from '../../../lib/admin/scrape-jobs';
import { createSupabaseServerClient } from '../../../lib/supabase.server';

export const GET: APIRoute = async (context) => {
  const jobId = context.url.searchParams.get('job') ?? '';
  if (!isUuid(jobId)) {
    return json({ ok: false, error: 'Invalid scrape job.' }, 400);
  }

  const supabase = createSupabaseServerClient(context);
  const jobResult = await getScrapeJob(supabase, jobId);
  if (jobResult.error) {
    return json({ ok: false, error: jobResult.error }, 500);
  }

  if (!jobResult.data) {
    return json({ ok: false, error: 'That scrape job was not found.' }, 404);
  }

  const [productsResult, aiJobResult] = await Promise.all([
    listRawProductsByJob(supabase, jobId),
    getAiJobByScrapeJob(supabase, jobId),
  ]);
  if (productsResult.error) {
    return json({ ok: false, error: productsResult.error }, 500);
  }
  if (aiJobResult.error) {
    return json({ ok: false, error: aiJobResult.error }, 500);
  }

  const runsResult = aiJobResult.data
    ? await listAiRunsByJob(supabase, aiJobResult.data.id)
    : { data: [], error: null };
  if (runsResult.error) {
    return json({ ok: false, error: runsResult.error }, 500);
  }

  const job = jobResult.data;
  const aiJob = aiJobResult.data;
  return json({
    ok: true,
    job: {
      id: job.id,
      source_collection_url: job.source_collection_url,
      source_collection_name: job.source_collection_name,
      job_status: job.job_status,
      products_discovered: job.products_discovered,
      products_completed: job.products_completed,
      products_failed: job.products_failed,
      remaining: jobRemaining(job),
      error_message: job.error_message,
    },
    ai: aiJob
      ? {
          id: aiJob.id,
          status: aiJob.status,
          total_products: aiJob.total_products,
          processed_products: aiJob.processed_products,
          failed_products: aiJob.failed_products,
          keywords_evaluated: aiJob.keywords_evaluated,
          error_message: aiJob.error_message,
        }
      : null,
    products: productsResult.data,
    runs: Object.fromEntries(runsResult.data.map((run) => [run.raw_product_id, run])),
  });
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
