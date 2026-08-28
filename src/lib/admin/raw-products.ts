import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Enums, Json, Tables } from '../../types/database';
import { isUuid } from './query';

export type ScrapeStatus = Enums<'scrape_status'>;
export type RawProduct = Tables<'raw_products'>;

export interface SpecificationRow {
  label: string;
  value: string;
}

export const SCRAPE_STATUS_LABELS: Record<ScrapeStatus, string> = {
  pending: 'Pending',
  scraped: 'Scraped',
  failed: 'Failed',
  processed: 'Processed',
};

const HISTORY_COLUMNS =
  'id, source_url, source_domain, source_title, source_model, source_price, source_currency, scrape_status, scrape_job_id, processed_product_id, scraped_at, updated_at, error_message' as const;

export function parseStringList(value: Json | null | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item.replace(/\s+/g, ' ').trim() : ''))
    .filter(Boolean);
}

export function parseSpecifications(value: Json | null | undefined): SpecificationRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const rows: SpecificationRow[] = [];
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

export function formatSourcePrice(price: number | string | null | undefined, currency: string | null | undefined): string {
  if (price == null || price === '') {
    return '—';
  }

  const amount = typeof price === 'number' ? price : Number.parseFloat(price);
  if (!Number.isFinite(amount)) {
    return '—';
  }

  const formatted = Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(/\.00$/, '');
  const code = currency?.trim().toUpperCase();
  if (!code || code === 'USD' || code === '$') {
    return `$${formatted}`;
  }

  return `${formatted} ${code}`;
}

export async function listRawProducts(supabase: SupabaseClient<Database>, limit = 25) {
  const { data, error } = await supabase
    .from('raw_products')
    .select(HISTORY_COLUMNS)
    .order('updated_at', { ascending: false })
    .limit(limit);

  return {
    data: data ?? [],
    error: error?.message ?? null,
  };
}

export async function listRawProductsByJob(supabase: SupabaseClient<Database>, jobId: string) {
  if (!isUuid(jobId)) {
    return { data: [], error: 'Invalid scrape job.' };
  }

  const { data, error } = await supabase
    .from('raw_products')
    .select(HISTORY_COLUMNS)
    .eq('scrape_job_id', jobId)
    .order('source_title', { ascending: true });

  return {
    data: data ?? [],
    error: error?.message ?? null,
  };
}

export async function getRawProduct(supabase: SupabaseClient<Database>, id: string) {
  if (!isUuid(id)) {
    return { data: null, error: 'Invalid raw product.' };
  }

  const { data, error } = await supabase.from('raw_products').select('*').eq('id', id).maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}
