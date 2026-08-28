import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function loadLocalEnv() {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(dirname(fileURLToPath(import.meta.url)), '../.env'),
  ];
  const loaded = new Set<string>();

  for (const envPath of candidates) {
    if (!existsSync(envPath) || loaded.has(envPath)) {
      continue;
    }
    loaded.add(envPath);

    for (const rawLine of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }

      const separator = line.indexOf('=');
      if (separator === -1) {
        continue;
      }

      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  }
}

function clampInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env and add your values.`);
  }

  return value;
}

export function loadEnv() {
  loadLocalEnv();

  return {
    supabaseUrl: required('SUPABASE_URL'),
    supabaseSecretKey: required('SUPABASE_SECRET_KEY'),
    scraperApiKey: required('SCRAPER_API_KEY'),
    port: Number.parseInt(process.env.SCRAPER_PORT ?? process.env.PORT ?? '8787', 10) || 8787,
    fetchTimeoutMs: Number.parseInt(process.env.SCRAPER_FETCH_TIMEOUT_MS ?? '15000', 10) || 15_000,
    concurrency: clampInt(process.env.SCRAPER_CONCURRENCY, 3, 1, 3),
    delayMs: clampInt(process.env.SCRAPER_DELAY_MS, 450, 150, 2_000),
    maxAttempts: clampInt(process.env.SCRAPER_MAX_ATTEMPTS, 3, 1, 5),
  };
}

export type ScraperEnv = ReturnType<typeof loadEnv>;
