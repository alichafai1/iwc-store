import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile(filename, { override = false } = {}) {
  const path = resolve(process.cwd(), filename);

  if (!existsSync(path)) {
    return false;
  }

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');

    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return true;
}

loadEnvFile('.env');
loadEnvFile('.env.local', { override: true });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  console.error('Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabasePublishableKey);
const healthUrl = new URL('/auth/v1/health', supabaseUrl);

const healthResponse = await fetch(healthUrl, {
  headers: {
    apikey: supabasePublishableKey,
  },
});

if (!healthResponse.ok) {
  console.error(`Supabase health check failed: ${healthResponse.status} ${healthResponse.statusText}`);
  process.exit(1);
}

const { error } = await supabase.auth.getSession();

if (error) {
  console.error('Supabase client request failed:', error.message);
  process.exit(1);
}

console.log('Supabase connection OK');
console.log(`Project URL: ${new URL(supabaseUrl).origin}`);
console.log(`Auth health: ${healthResponse.status}`);
console.log('Client: auth.getSession() succeeded');
