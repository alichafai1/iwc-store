import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ScraperEnv } from './env.js';

export type ScraperSupabase = SupabaseClient;

export function createScraperSupabase(env: ScraperEnv): ScraperSupabase {
  return createClient(env.supabaseUrl, env.supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
