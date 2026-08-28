import { timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { UnauthorizedError } from './errors.js';
import { loadEnv, type ProcessorEnv } from './env.js';
import { processCollectionRequestSchema, retryFailedRequestSchema } from './http-schemas.js';
import {
  listRunningProcessingJobIds,
  recoverAndResumeStaleProcessingJobs,
  retryFailedProducts,
  startCollectionProcessing,
} from './process.js';
import { createProcessorSupabase, type ProcessorSupabase } from './supabase.js';

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

function json(response: ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

function authorize(request: IncomingMessage, apiKey: string) {
  const header = request.headers.authorization;
  const bearer = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const fromHeader = String(request.headers['x-api-key'] ?? '').trim();
  const provided = bearer || fromHeader;

  if (!provided || provided.length !== apiKey.length) {
    throw new UnauthorizedError();
  }

  if (!timingSafeEqual(Buffer.from(provided), Buffer.from(apiKey))) {
    throw new UnauthorizedError();
  }
}

async function readJsonBody(request: IncomingMessage): Promise<{ ok: true; body: unknown } | { ok: false; error: string }> {
  const raw = await readBody(request);
  if (!raw.trim()) {
    return { ok: true, body: {} };
  }

  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, error: 'Request body must be JSON.' };
  }
}

async function handleProcessCollection(
  request: IncomingMessage,
  response: ServerResponse,
  env: ProcessorEnv,
  supabase: ProcessorSupabase,
) {
  authorize(request, env.processorApiKey);
  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) {
    json(response, 400, { ok: false, error: parsedBody.error, code: 'invalid_json' });
    return;
  }

  const parsed = processCollectionRequestSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    json(response, 400, {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid request.',
      code: 'invalid_request',
    });
    return;
  }

  const result = await startCollectionProcessing({
    scrapeJobId: parsed.data.scrapeJobId,
    reprocessExisting: parsed.data.reprocessExisting,
    env,
    supabase,
  });
  json(response, result.ok ? 202 : result.statusCode, result);
}

async function handleRetryFailed(
  request: IncomingMessage,
  response: ServerResponse,
  env: ProcessorEnv,
  supabase: ProcessorSupabase,
) {
  authorize(request, env.processorApiKey);
  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) {
    json(response, 400, { ok: false, error: parsedBody.error, code: 'invalid_json' });
    return;
  }

  const parsed = retryFailedRequestSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    json(response, 400, {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid request.',
      code: 'invalid_request',
    });
    return;
  }

  const result = await retryFailedProducts({
    processingJobId: parsed.data.processingJobId,
    rawProductId: parsed.data.rawProductId,
    env,
    supabase,
  });
  json(response, result.ok ? 202 : result.statusCode, result);
}

function sendAuthError(response: ServerResponse, error: unknown) {
  if (error instanceof UnauthorizedError) {
    json(response, 401, { ok: false, error: error.message, code: error.code });
    return;
  }

  json(response, 500, {
    ok: false,
    error: error instanceof Error ? error.message : 'Internal processor error.',
    code: 'internal_error',
  });
}

export function startServer(env = loadEnv()) {
  const supabase = createProcessorSupabase(env);

  const server = createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

      if (request.method === 'GET' && url.pathname === '/health') {
        json(response, 200, {
          ok: true,
          provider: env.contentAiProvider,
          contentAiProvider: env.contentAiProvider,
          model: env.contentAiProvider === 'cursor' ? env.cursorContentModel || 'auto' : env.openaiModel,
          openaiRequired: env.contentAiProvider === 'openai',
          runningJobIds: listRunningProcessingJobIds(),
        });
        return;
      }

      try {
        if (request.method === 'POST' && url.pathname === '/process-collection') {
          await handleProcessCollection(request, response, env, supabase);
          return;
        }

        if (request.method === 'POST' && url.pathname === '/retry-failed') {
          await handleRetryFailed(request, response, env, supabase);
          return;
        }
      } catch (error) {
        sendAuthError(response, error);
        return;
      }

      json(response, 404, { ok: false, error: 'Not found.', code: 'not_found' });
    })();
  });

  server.listen(env.port, '127.0.0.1', () => {
    console.log(`Product processor listening on http://127.0.0.1:${env.port}`);
    void recoverAndResumeStaleProcessingJobs(supabase, env)
      .then((resumed) => {
        if (resumed.length > 0) {
          console.info(`[ai] recovered and resumed ${resumed.length} stale processing job(s)`);
        }
      })
      .catch((error) => {
        console.error(`[ai] stale job recovery failed: ${error instanceof Error ? error.message : String(error)}`);
      });
  });

  return server;
}

if (process.argv[1] && /index\.[cm]?[jt]s$/.test(process.argv[1])) {
  startServer();
}
