import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROCESS_TIMEOUT_MS = 45_000;
const SERVER_ENV_NAMES = ['PROCESSOR_SERVICE_URL', 'PROCESSOR_API_KEY'] as const;

export interface ProcessorCallResult {
  ok: boolean;
  processingJobId?: string;
  status?: string;
  reused?: boolean;
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

export function getProcessorConfig(): { url: string; apiKey: string } | { error: string } {
  const serviceUrl = readEnv('PROCESSOR_SERVICE_URL').replace(/\/+$/, '');
  const apiKey = readEnv('PROCESSOR_API_KEY');

  if (!serviceUrl || !apiKey) {
    return {
      error:
        'The product processor is not configured. Add PROCESSOR_SERVICE_URL and PROCESSOR_API_KEY to the Astro .env (server-only, never PUBLIC_).',
    };
  }

  return { url: serviceUrl, apiKey };
}

async function callProcessor(path: string, body: Record<string, unknown>): Promise<ProcessorCallResult> {
  const config = getProcessorConfig();
  if ('error' in config) {
    return { ok: false, error: config.error };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROCESS_TIMEOUT_MS);

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
    const processingJobId = typeof record.processingJobId === 'string' ? record.processingJobId : undefined;
    const status = typeof record.status === 'string' ? record.status : undefined;
    const reused = record.reused === true;
    const rawError = typeof record.error === 'string' ? record.error.trim() : '';
    const error = /fetch failed|econnrefused|enotfound|etimedout/i.test(rawError)
      ? 'Product Processor Offline'
      : rawError || `The processor returned HTTP ${response.status}.`;

    if (record.ok === true && processingJobId) {
      return { ok: true, processingJobId, status, reused };
    }

    return { ok: false, processingJobId, status, error };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, error: 'Product Processor Offline' };
    }

    return {
      ok: false,
      error: 'Product Processor Offline',
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function getProcessorHealth(): Promise<{
  online: boolean;
  provider?: string;
  model?: string;
  openaiRequired?: boolean;
  runningJobIds: string[];
  error?: string;
}> {
  const config = getProcessorConfig();
  if ('error' in config) {
    return { online: false, runningJobIds: [], error: config.error };
  }

  try {
    const response = await fetch(`${config.url}/health`, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) {
      return { online: false, runningJobIds: [], error: 'Product Processor Offline' };
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const runningJobIds = Array.isArray(payload.runningJobIds)
      ? payload.runningJobIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
      : [];
    return {
      online: payload.ok === true,
      provider: typeof payload.provider === 'string' ? payload.provider : undefined,
      model: typeof payload.model === 'string' ? payload.model : undefined,
      openaiRequired: payload.openaiRequired === true,
      runningJobIds,
      error: payload.ok === true ? undefined : 'Product Processor Offline',
    };
  } catch {
    return { online: false, runningJobIds: [], error: 'Product Processor Offline' };
  }
}

export async function requestCollectionProcessing(scrapeJobId: string): Promise<ProcessorCallResult> {
  return callProcessor('/process-collection', { scrapeJobId });
}

export async function requestRetryFailedAi(
  processingJobId: string,
  rawProductId?: string,
): Promise<ProcessorCallResult> {
  return callProcessor('/retry-failed', {
    processingJobId,
    ...(rawProductId ? { rawProductId } : {}),
  });
}
