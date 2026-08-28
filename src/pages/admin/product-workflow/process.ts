export const prerender = false;

import type { APIRoute } from 'astro';
import { isSameOriginRequest } from '../../../lib/admin-auth';
import { countKeywords } from '../../../lib/admin/keywords';
import { isUuid } from '../../../lib/admin/query';
import { requestCollectionProcessing, requestRetryFailedAi } from '../../../lib/admin/processor';
import { createSupabaseServerClient } from '../../../lib/supabase.server';

export const POST: APIRoute = async (context) => {
  if (!isSameOriginRequest(context.request)) {
    return json({ ok: false, error: 'This request could not be verified.' }, 403);
  }

  let body: unknown = {};
  try {
    body = await context.request.json();
  } catch {
    body = {};
  }

  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const scrapeJobId = typeof record.scrapeJobId === 'string' ? record.scrapeJobId : '';
  const processingJobId = typeof record.processingJobId === 'string' ? record.processingJobId : '';
  const retry = record.retry === true;

  if (retry) {
    if (!isUuid(processingJobId)) {
      return json({ ok: false, error: 'A valid processing job is required.' }, 400);
    }
    const result = await requestRetryFailedAi(processingJobId);
    return json(result, result.ok ? 202 : 400);
  }

  if (!isUuid(scrapeJobId)) {
    return json({ ok: false, error: 'A valid scrape job is required.' }, 400);
  }

  const supabase = createSupabaseServerClient(context);
  const keywordCount = await countKeywords(supabase);
  if (keywordCount === 0) {
    return json(
      { ok: false, error: 'Keyword Library is empty. Import your keyword files before starting AI Content.' },
      400,
    );
  }

  const result = await requestCollectionProcessing(scrapeJobId);
  return json(result, result.ok ? 202 : 400);
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
