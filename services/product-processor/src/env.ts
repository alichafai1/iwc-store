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

      // Service .env is loaded last and must win over an inherited PORT from concurrently.
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

  const contentAiProvider = (process.env.CONTENT_AI_PROVIDER?.trim() || 'cursor').toLowerCase();
  const openaiApiKey = process.env.OPENAI_API_KEY?.trim() || '';

  if (contentAiProvider === 'openai' && !openaiApiKey) {
    throw new Error('OPENAI_API_KEY is required when CONTENT_AI_PROVIDER=openai.');
  }

  return {
    contentAiProvider: contentAiProvider === 'openai' ? 'openai' : 'cursor',
    cursorContentModel:
      process.env.CURSOR_CONTENT_MODEL?.trim() || process.env.CURSOR_GPT_MODEL?.trim() || '',
    cursorAgentBin: process.env.CURSOR_AGENT_BIN?.trim() || '',
    cursorTimeoutMs:
      Number.parseInt(
        process.env.CURSOR_CONTENT_TIMEOUT_MS ?? process.env.CURSOR_GPT_TIMEOUT_MS ?? '180000',
        10,
      ) || 180_000,
    openaiApiKey,
    openaiModel: process.env.OPENAI_PRODUCT_MODEL?.trim() || 'gpt-5.6-terra',
    supabaseUrl: required('SUPABASE_URL'),
    supabaseSecretKey: required('SUPABASE_SECRET_KEY'),
    processorApiKey: required('PROCESSOR_API_KEY'),
    port: Number.parseInt(process.env.PROCESSOR_PORT ?? process.env.PORT ?? '8788', 10) || 8788,
    concurrency: clampInt(process.env.PROCESSOR_CONCURRENCY, 2, 1, 2),
    keywordBatchSize: clampInt(process.env.KEYWORD_BATCH_SIZE, 80, 20, 150),
    maxAttempts: clampInt(process.env.PROCESSOR_MAX_ATTEMPTS, 3, 1, 5),
  } as const;
}

export type ProcessorEnv = ReturnType<typeof loadEnv>;
