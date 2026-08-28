import { timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { retryFailedProducts, startCollectionScrape } from './collection.js';
import { UnauthorizedError } from './errors.js';
import { loadEnv, type ScraperEnv } from './env.js';
import { retryFailedRequestSchema, scrapeCollectionRequestSchema, scrapeRequestSchema } from './schemas.js';
import { scrapeProduct } from './scrape.js';
import { createScraperSupabase, type ScraperSupabase } from './supabase.js';

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

async function handleScrape(
  request: IncomingMessage,
  response: ServerResponse,
  env: ScraperEnv,
  supabase: ScraperSupabase,
) {
  authorize(request, env.scraperApiKey);
  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) {
    json(response, 400, { ok: false, error: parsedBody.error, code: 'invalid_json' });
    return;
  }

  const parsed = scrapeRequestSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    json(response, 400, {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid request.',
      code: 'invalid_request',
    });
    return;
  }

  const result = await scrapeProduct({ url: parsed.data.url, env, supabase });
  json(response, result.ok ? 200 : result.statusCode, result);
}

async function handleScrapeCollection(
  request: IncomingMessage,
  response: ServerResponse,
  env: ScraperEnv,
  supabase: ScraperSupabase,
) {
  authorize(request, env.scraperApiKey);
  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) {
    json(response, 400, { ok: false, error: parsedBody.error, code: 'invalid_json' });
    return;
  }

  const parsed = scrapeCollectionRequestSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    json(response, 400, {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid request.',
      code: 'invalid_request',
    });
    return;
  }

  const result = await startCollectionScrape({ url: parsed.data.url, env, supabase });
  json(response, result.ok ? 202 : result.statusCode, result);
}

async function handleRetryFailed(
  request: IncomingMessage,
  response: ServerResponse,
  env: ScraperEnv,
  supabase: ScraperSupabase,
) {
  authorize(request, env.scraperApiKey);
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

  const result = await retryFailedProducts({ jobId: parsed.data.jobId, env, supabase });
  json(response, result.ok ? 202 : result.statusCode, result);
}

function sendAuthError(response: ServerResponse, error: unknown) {
  if (error instanceof UnauthorizedError) {
    json(response, 401, { ok: false, error: error.message, code: error.code });
    return;
  }

  json(response, 500, {
    ok: false,
    error: error instanceof Error ? error.message : 'Internal scraper error.',
    code: 'internal_error',
  });
}

export function startServer(env = loadEnv()) {
  const supabase = createScraperSupabase(env);

  const server = createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

      if (request.method === 'GET' && url.pathname === '/health') {
        json(response, 200, { ok: true });
        return;
      }

      try {
        if (request.method === 'POST' && url.pathname === '/scrape') {
          await handleScrape(request, response, env, supabase);
          return;
        }

        if (request.method === 'POST' && url.pathname === '/scrape-collection') {
          await handleScrapeCollection(request, response, env, supabase);
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
    console.log(`Product scraper listening on http://127.0.0.1:${env.port}`);
  });

  return server;
}

if (process.argv[1] && /index\.[cm]?[jt]s$/.test(process.argv[1])) {
  startServer();
}
