import { errorMessage, ScraperError, TimeoutError } from './errors.js';

const USER_AGENT = 'IWCStoreProductScraper/0.1 (+internal-workflow)';

export interface FetchedPage {
  html: string;
  finalUrl: URL;
  status: number;
  renderer: 'fetch' | 'playwright';
}

export async function fetchHtml(url: URL, timeoutMs: number): Promise<FetchedPage> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en',
        'user-agent': USER_AGENT,
      },
    });

    const html = await response.text();
    const finalUrl = new URL(response.url || url.toString());

    if (!response.ok) {
      throw new ScraperError(`The source page returned HTTP ${response.status}.`, {
        statusCode: 502,
        code: 'fetch_failed',
      });
    }

    return { html, finalUrl, status: response.status, renderer: 'fetch' };
  } catch (error) {
    if (error instanceof ScraperError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError();
    }

    throw new ScraperError(`Could not fetch the product page: ${errorMessage(error)}`, {
      statusCode: 502,
      code: 'fetch_failed',
      cause: error,
    });
  } finally {
    clearTimeout(timer);
  }
}

export function looksLikeClientRenderedPage(html: string): boolean {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const scriptCount = (html.match(/<script/gi) ?? []).length;
  return text.length < 280 && scriptCount >= 3;
}
