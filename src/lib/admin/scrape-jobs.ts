import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Enums, Tables } from '../../types/database';
import { isUuid } from './query';

export type ScrapeJobStatus = Enums<'scrape_job_status'>;
export type ScrapeJob = Tables<'scrape_jobs'>;

export const SCRAPE_JOB_STATUS_LABELS: Record<ScrapeJobStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
};

const JOB_COLUMNS =
  'id, source_collection_url, source_collection_name, source_domain, products_discovered, products_completed, products_failed, job_status, error_message, started_at, completed_at, created_at, updated_at' as const;

export function jobRemaining(job: Pick<ScrapeJob, 'products_discovered' | 'products_completed' | 'products_failed'>): number {
  return Math.max(0, job.products_discovered - job.products_completed - job.products_failed);
}

export async function getScrapeJob(supabase: SupabaseClient<Database>, id: string) {
  if (!isUuid(id)) {
    return { data: null, error: 'Invalid scrape job.' };
  }

  const { data, error } = await supabase.from('scrape_jobs').select(JOB_COLUMNS).eq('id', id).maybeSingle();
  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getLatestScrapeJob(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('scrape_jobs')
    .select(JOB_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data?.[0] ?? null, error: null };
}

export async function listScrapeJobs(supabase: SupabaseClient<Database>, limit = 10) {
  const { data, error } = await supabase
    .from('scrape_jobs')
    .select(JOB_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);

  return {
    data: data ?? [],
    error: error?.message ?? null,
  };
}
