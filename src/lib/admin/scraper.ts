import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRAPE_TIMEOUT_MS = 60_000;
const COLLECTION_START_TIMEOUT_MS = 45_000;
const SERVER_ENV_NAMES = ['SCRAPER_SERVICE_URL', 'SCRAPER_API_KEY'] as const;

export interface ScraperCallResult {
  ok: boolean;
  id?: string;
  jobId?: string;
  discovered?: number;
  collectionName?: string | null;
  error?: string;
}

function parseEnvFile(filePath: string): Record<string, string> {
  const parsed: Record<string, string> = {};

  for (const rawLine of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
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

    parsed[key] = value;
  }

  return parsed;
}

function loadProjectEnv(): Record<string, string> {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env'),
  ];

  for (const envPath of candidates) {
    if (existsSync(envPath)) {
      return parseEnvFile(envPath);
    }
  }

  return {};
}

function readEnv(name: (typeof SERVER_ENV_NAMES)[number]): string {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) {
    return fromProcess;
  }

  return (loadProjectEnv()[name] ?? '').trim();
}

export function getScraperConfig(): { url: string; apiKey: string } | { error: string } {
  const serviceUrl = readEnv('SCRAPER_SERVICE_URL').replace(/\/+$/, '');
  const apiKey = readEnv('SCRAPER_API_KEY');

  if (!serviceUrl || !apiKey) {
    return {
      error:
        'The scraper is not configured. Add SCRAPER_SERVICE_URL and SCRAPER_API_KEY to the Astro .env (server-only, never PUBLIC_).',
    };
  }

  return { url: serviceUrl, apiKey };
}

export function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const isHttpProductUrl = isHttpUrl;

async function callScraper(
  path: string,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<ScraperCallResult> {
  const config = getScraperConfig();
  if ('error' in config) {
    return { ok: false, error: config.error };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${config.url}${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    const id = typeof record.id === 'string' ? record.id : undefined;
    const jobId = typeof record.jobId === 'string' ? record.jobId : undefined;
    const discovered = typeof record.discovered === 'number' ? record.discovered : undefined;
    const collectionName = typeof record.collectionName === 'string' ? record.collectionName : null;
    const error =
      typeof record.error === 'string' && record.error.trim()
        ? record.error.trim()
        : `The scraper returned HTTP ${response.status}.`;

    if (record.ok === true && (id || jobId)) {
      return { ok: true, id, jobId, discovered, collectionName };
    }

    return { ok: false, id, jobId, discovered, error };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, error: 'The scraper timed out. Try again, or check that the scraper service is running.' };
    }

    return {
      ok: false,
      error: 'Could not reach the scraper service. Start it with npm run dev in services/product-scraper.',
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function requestProductScrape(sourceUrl: string): Promise<ScraperCallResult> {
  return callScraper('/scrape', { url: sourceUrl }, SCRAPE_TIMEOUT_MS);
}

export async function requestCollectionScrape(collectionUrl: string): Promise<ScraperCallResult> {
  return callScraper('/scrape-collection', { url: collectionUrl }, COLLECTION_START_TIMEOUT_MS);
}

export async function requestRetryFailed(jobId: string): Promise<ScraperCallResult> {
  return callScraper('/retry-failed', { jobId }, COLLECTION_START_TIMEOUT_MS);
}
