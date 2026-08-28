import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { getSupabasePublicEnv } from './supabase-env';

const { url, publishableKey } = getSupabasePublicEnv();

export const supabase: SupabaseClient<Database> = createClient<Database>(url, publishableKey);
