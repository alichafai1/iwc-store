import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';
import type { ProcessorEnv } from '../env.js';
import { errorMessage, ProcessorError } from '../errors.js';
import { withRetries } from '../pool.js';
import { extractJsonValue, parseAgentJsonStdout } from './json.js';
import type { ContentAiProvider, GenerateJsonRequest, GenerateJsonResult } from './types.js';

const execFileAsync = promisify(execFile);

function resolveAgentBin(configured?: string): { bin: string; prefix: string[] } {
  if (configured && existsSync(configured)) {
    const base = configured.split(/[/\\]/).pop() ?? configured;
    return { bin: configured, prefix: base === 'cursor' ? ['agent'] : [] };
  }

  const candidates = [
    join(homedir(), '.local/bin/agent'),
    join(homedir(), '.local/bin/cursor-agent'),
    '/Applications/Cursor.app/Contents/Resources/app/bin/cursor',
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      const base = candidate.split(/[/\\]/).pop() ?? candidate;
      return { bin: candidate, prefix: base === 'cursor' ? ['agent'] : [] };
    }
  }

  return { bin: 'agent', prefix: [] };
}

function isCursorNetworkFailure(text: string): boolean {
  const value = text.toLowerCase();
  return (
    value.includes('[aborted]') ||
    value.includes('before secure tls') ||
    value.includes('socket disconnected') ||
    value.includes('socket hang up') ||
    value.includes('econnreset') ||
    value.includes('econnrefused') ||
    value.includes('enotfound') ||
    value.includes('eai_again') ||
    value.includes('tls connection') ||
    value.includes('client network socket')
  );
}

function isCursorUsageLimit(text: string): boolean {
  const value = text.toLowerCase();
  return (
    value.includes('usage limit') ||
    value.includes('spend limit') ||
    (value.includes('actionrequirederror') && value.includes('limit'))
  );
}

function isCursorResourceExhausted(text: string): boolean {
  const value = text.toLowerCase();
  return value.includes('resource_exhausted') || value.includes('resource exhausted');
}

function classifyCliError(stderr: string, stdout: string, code: number | null): ProcessorError {
  const text = `${stderr}\n${stdout}`.toLowerCase();
  if (text.includes('authentication required') || text.includes('not logged in') || code === 401) {
    return new ProcessorError(
      'Cursor Agent CLI is not authenticated. Run `agent login`, then retry Phase 2.',
      { statusCode: 401, code: 'cursor_auth' },
    );
  }
  if (isCursorUsageLimit(`${stderr}\n${stdout}`)) {
    return new ProcessorError(
      'Cursor account usage or spend limit was reached. Phase 2 stopped so remaining products are not sent doomed requests. Raise the spend limit or wait for the billing cycle to reset, then retry failed and pending products only.',
      { statusCode: 402, code: 'cursor_usage_limit' },
    );
  }
  if (isCursorResourceExhausted(`${stderr}\n${stdout}`)) {
    return new ProcessorError('Cursor Agent CLI was rate-limited (resource exhausted). Retrying.', {
      statusCode: 503,
      code: 'cursor_resource_exhausted',
    });
  }
  if (text.includes('cannot use this model')) {
    return new ProcessorError('Cursor model was temporarily unavailable. Retrying.', {
      statusCode: 503,
      code: 'cursor_model_busy',
    });
  }
  if (text.includes('model') && (text.includes('not found') || text.includes('unavailable') || text.includes('unknown'))) {
    return new ProcessorError(
      'The requested Cursor model is unavailable. Run `agent models` and set CURSOR_CONTENT_MODEL to an exact slug.',
      { statusCode: 422, code: 'cursor_model_unavailable' },
    );
  }
  if (isCursorNetworkFailure(text)) {
    return new ProcessorError(
      'Cursor Agent CLI lost the TLS connection before a response was received.',
      { statusCode: 502, code: 'cursor_network' },
    );
  }
  if (text.includes('timeout') || text.includes('timed out')) {
    return new ProcessorError('Cursor Agent CLI timed out.', { statusCode: 504, code: 'cursor_timeout' });
  }
  if (text.includes('enoent') || (text.includes('not found') && text.includes('agent'))) {
    return new ProcessorError(
      'Cursor Agent CLI was not found. Install it, then run `agent login`.',
      { statusCode: 500, code: 'cursor_cli_missing' },
    );
  }
  return new ProcessorError(stderr.trim() || stdout.trim() || `Cursor Agent CLI exited with code ${code ?? 'unknown'}.`, {
    statusCode: 502,
    code: 'cursor_cli_failed',
  });
}

function parseModelSlugs(output: string): string[] {
  const slugs = new Set<string>();
  for (const raw of output.split(/[\s,]+/)) {
    const token = raw.replace(/^["'`[]+|["'`,\]]+$/g, '').trim();
    if (
      /^[a-z0-9][a-z0-9._:-]*$/i.test(token) &&
      (token.toLowerCase().includes('gpt') || token.toLowerCase().includes('grok'))
    ) {
      slugs.add(token);
    }
  }
  return [...slugs];
}

export function preferGpt56Sol(slugs: string[]): string | null {
  const gpt = slugs.filter((slug) => /gpt/i.test(slug) && !/grok/i.test(slug));
  return (
    gpt.find((slug) => slug === 'gpt-5.6-sol') ??
    gpt.find((slug) => slug === 'gpt-5.6-sol-medium') ??
    gpt.find((slug) => /^gpt-5\.6-sol(?!-fast)/i.test(slug)) ??
    gpt.find((slug) => /gpt-5\.6-sol/i.test(slug)) ??
    null
  );
}

export function preferGrok46(slugs: string[]): string | null {
  const grok = slugs.filter((slug) => /grok/i.test(slug));
  return (
    grok.find((slug) => slug === 'cursor-grok-4.6-xhigh') ??
    grok.find((slug) => /grok-4\.6-xhigh$/i.test(slug) && !/fast/i.test(slug)) ??
    grok.find((slug) => /grok-4\.6-high$/i.test(slug) && !/fast/i.test(slug)) ??
    grok.find((slug) => /grok-4\.6/i.test(slug) && !/fast/i.test(slug)) ??
    grok.find((slug) => /grok/i.test(slug) && !/fast/i.test(slug)) ??
    grok[0] ??
    null
  );
}

export async function listCursorModels(env: ProcessorEnv): Promise<string[]> {
  const { bin, prefix } = resolveAgentBin(env.cursorAgentBin);
  try {
    const { stdout, stderr } = await execFileAsync(bin, [...prefix, 'models'], {
      timeout: 30_000,
      maxBuffer: 2_000_000,
      encoding: 'utf8',
    });
    return parseModelSlugs(`${stdout}\n${stderr}`);
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; code?: number };
    throw classifyCliError(String(err.stderr ?? ''), String(err.stdout ?? errorMessage(error)), err.code ?? null);
  }
}

export async function resolveCursorContentModel(env: ProcessorEnv): Promise<string> {
  if (env.cursorContentModel) {
    return env.cursorContentModel;
  }

  const slugs = await listCursorModels(env);
  const selected = preferGrok46(slugs) ?? preferGpt56Sol(slugs);
  if (!selected) {
    throw new ProcessorError(
      'Could not find a Grok or GPT slug in `agent models`. Set CURSOR_CONTENT_MODEL to an exact slug from that command.',
      { statusCode: 422, code: 'cursor_model_missing' },
    );
  }
  return selected;
}

export const resolveCursorGptModel = resolveCursorContentModel;

export function createCursorGptProvider(env: ProcessorEnv, model: string): ContentAiProvider {
  const { bin, prefix } = resolveAgentBin(env.cursorAgentBin);

  return {
    name: 'cursor',
    model,
    async generateJson<T>(request: GenerateJsonRequest<T>): Promise<GenerateJsonResult<T>> {
      return withRetries(
        env.maxAttempts,
        8_000,
        async (attempt) => {
          const started = Date.now();
          const workspace = mkdtempSync(join(tmpdir(), 'iwc-cursor-gpt-'));
          const prompt = [
            request.system,
            '',
            request.jsonOnlyInstruction ??
              'Return ONLY valid JSON. Do not edit files, run commands, browse the repository, or write commentary. No markdown. No code fences.',
            '',
            request.user,
          ].join('\n');

          try {
            const promptPath = join(workspace, 'PROMPT.txt');
            writeFileSync(promptPath, prompt, 'utf8');
            const argsPrompt =
              'Read PROMPT.txt in this workspace and follow it exactly. Return ONLY the required JSON object. Do not edit files, run commands, browse other files, or write commentary.';

            const args = [
              ...prefix,
              '--print',
              '--mode=ask',
              '--model',
              model,
              '--output-format',
              'json',
              '--trust',
              '--sandbox',
              'enabled',
              '--workspace',
              workspace,
              argsPrompt,
            ];

            const { stdout, stderr } = await execFileAsync(bin, args, {
              timeout: env.cursorTimeoutMs,
              maxBuffer: 10_000_000,
              encoding: 'utf8',
              windowsHide: true,
            });

            if (stderr.trim()) {
              console.warn(`[ai] provider=cursor model=${model} attempt=${attempt} stderr=${stderr.trim().slice(0, 500)}`);
            }

            const parsedCli = parseAgentJsonStdout(stdout);
            let jsonValue: unknown;
            try {
              jsonValue = extractJsonValue(parsedCli.resultText);
            } catch (parseError) {
              throw new ProcessorError(errorMessage(parseError), { statusCode: 422, code: 'invalid_json' });
            }
            const parsed = request.validator.safeParse(jsonValue);
            if (!parsed.success) {
              throw new ProcessorError(
                `Model output failed validation: ${parsed.error.issues[0]?.message ?? 'invalid JSON.'}`,
                { statusCode: 422, code: 'zod_validation' },
              );
            }

            const durationMs = Date.now() - started;
            console.info(
              `[ai] provider=cursor model=${model} schema=${request.schemaName} success=true attempt=${attempt} duration_ms=${durationMs}`,
            );
            return {
              data: parsed.data,
              meta: { provider: 'cursor', model, attempt, durationMs, success: true },
            };
          } catch (error) {
            const durationMs = Date.now() - started;
            const execError = error as { stdout?: string; stderr?: string; code?: string | number; killed?: boolean };
            if (execError.killed || execError.code === 'ETIMEDOUT') {
              console.info(
                `[ai] provider=cursor model=${model} schema=${request.schemaName} success=false attempt=${attempt} duration_ms=${durationMs} error=timeout`,
              );
              throw new ProcessorError('Cursor Agent CLI timed out.', { statusCode: 504, code: 'cursor_timeout', cause: error });
            }
            if (error instanceof ProcessorError) {
              console.info(
                `[ai] provider=cursor model=${model} schema=${request.schemaName} success=false attempt=${attempt} duration_ms=${durationMs} error=${error.code}`,
              );
              throw error;
            }
            const classified = classifyCliError(
              String(execError.stderr ?? ''),
              `${execError.stdout ?? ''}\n${errorMessage(error)}`,
              Number(execError.code) || null,
            );
            console.info(
              `[ai] provider=cursor model=${model} schema=${request.schemaName} success=false attempt=${attempt} duration_ms=${durationMs} error=${classified.code}`,
            );
            throw classified;
          } finally {
            rmSync(workspace, { recursive: true, force: true });
          }
        },
        isRetryableCursorError,
      );
    },
  };
}

export function isRetryableCursorError(error: unknown): boolean {
  const code = error instanceof ProcessorError ? error.code : '';
  if (
    code === 'cursor_auth' ||
    code === 'cursor_usage_limit' ||
    code === 'cursor_model_unavailable' ||
    code === 'cursor_model_invalid' ||
    code === 'cursor_model_missing'
  ) {
    return false;
  }
  const message = errorMessage(error);
  if (isCursorUsageLimit(message)) {
    return false;
  }
  return (
    code === 'cursor_timeout' ||
    code === 'cursor_network' ||
    code === 'cursor_model_busy' ||
    code === 'cursor_resource_exhausted' ||
    code === 'malformed_model_output' ||
    code === 'invalid_json' ||
    code === 'zod_validation' ||
    message.toLowerCase().includes('malformed json') ||
    message.toLowerCase().includes('timed out') ||
    message.toLowerCase().includes('timeout') ||
    message.toLowerCase().includes('econnreset') ||
    message.toLowerCase().includes('temporar') ||
    message.toLowerCase().includes('overloaded') ||
    message.toLowerCase().includes('rate limit') ||
    isCursorResourceExhausted(message) ||
    isCursorNetworkFailure(message)
  );
}

export const pingSchema = z.object({
  ok: z.literal(true),
  source: z.string(),
});
