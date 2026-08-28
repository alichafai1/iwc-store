import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ProcessorEnv } from './env.js';

export type ProcessorSupabase = SupabaseClient;

export function createProcessorSupabase(env: ProcessorEnv): ProcessorSupabase {
  return createClient(env.supabaseUrl, env.supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
