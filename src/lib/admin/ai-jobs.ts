import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Enums, Json, Tables } from '../../types/database';
import { isUuid } from './query';

export type AiProcessingStatus = Enums<'ai_processing_status'>;
export type AiProductRunStatus = Enums<'ai_product_run_status'>;
export type AiProcessingJob = Tables<'ai_processing_jobs'>;
export type AiProductRun = Tables<'ai_product_runs'>;

export const AI_JOB_STATUS_LABELS: Record<AiProcessingStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  completed_with_errors: 'Completed with errors',
  failed: 'Failed',
};

export const AI_RUN_STATUS_LABELS: Record<AiProductRunStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
};

export function aiFailureReasonLabel(errorMessage?: string | null): string {
  const text = (errorMessage ?? '').trim();
  if (!text) {
    return 'AI failed';
  }

  const code = text.match(/^\[([a-z0-9_]+)\]/i)?.[1]?.toLowerCase() ?? '';
  const lower = text.toLowerCase();

  if (code === 'invalid_json' || lower.includes('malformed json') || lower.includes('invalid json') || lower.includes('empty response')) {
    return 'AI failed — Invalid JSON';
  }
  if (code === 'zod_validation' || code === 'malformed_model_output' || lower.includes('failed validation')) {
    return 'AI failed — Zod validation';
  }
  if (code === 'cursor_timeout' || lower.includes('timed out') || /\btimeout\b/.test(lower)) {
    return 'AI failed — Cursor timeout';
  }
  if (lower.includes('factual')) {
    return 'AI failed — factual validation';
  }
  if (
    code === 'cursor_network' ||
    lower.includes('[aborted]') ||
    lower.includes('tls') ||
    lower.includes('socket disconnected') ||
    lower.includes('client network socket')
  ) {
    return 'AI failed — Cursor network';
  }

  return 'AI failed';
}

export function parseStringArray(value: Json | null | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

export async function getAiJobByScrapeJob(supabase: SupabaseClient<Database>, scrapeJobId: string) {
  if (!isUuid(scrapeJobId)) {
    return { data: null, error: 'Invalid scrape job.' };
  }

  const { data, error } = await supabase
    .from('ai_processing_jobs')
    .select('*')
    .eq('scrape_job_id', scrapeJobId)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function listAiRunsByJob(supabase: SupabaseClient<Database>, processingJobId: string) {
  if (!isUuid(processingJobId)) {
    return { data: [], error: 'Invalid processing job.' };
  }

  const { data, error } = await supabase
    .from('ai_product_runs')
    .select(
      'id, processing_job_id, raw_product_id, product_id, status, primary_keyword, selected_keywords, used_keywords, unused_relevant_keywords, coverage_percent, attempts, error_message, created_at, completed_at',
    )
    .eq('processing_job_id', processingJobId);

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data ?? [], error: null };
}

export function draftStatusLabel(options: {
  scrapeStatus: string;
  processedProductId: string | null;
  aiStatus?: AiProductRunStatus | null;
  errorMessage?: string | null;
}): string {
  if (options.processedProductId && options.aiStatus === 'completed') {
    return 'Draft ready';
  }
  if (options.aiStatus === 'failed') {
    return aiFailureReasonLabel(options.errorMessage);
  }
  if (options.aiStatus === 'processing' || options.aiStatus === 'pending') {
    return 'Creating draft';
  }
  if (options.scrapeStatus === 'scraped') {
    return 'Waiting for AI';
  }
  return '—';
}
