import { TimeoutError } from './errors.js';
import type { FetchedPage } from './fetch-html.js';

const PLAYWRIGHT_TIMEOUT_MS = 20_000;

export async function renderWithPlaywright(url: URL): Promise<FetchedPage> {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage({
      userAgent: 'IWCStoreProductScraper/0.1 (+internal-workflow)',
    });

    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (type === 'image' || type === 'media' || type === 'font') {
        return route.abort();
      }

      return route.continue();
    });

    const response = await page.goto(url.toString(), {
      waitUntil: 'domcontentloaded',
      timeout: PLAYWRIGHT_TIMEOUT_MS,
    });

    await new Promise((resolve) => setTimeout(resolve, 750));
    const html = await page.content();
    const finalUrl = new URL(page.url());

    if (!response) {
      throw new Error('Playwright did not receive a document response.');
    }

    return {
      html,
      finalUrl,
      status: response.status(),
      renderer: 'playwright',
    };
  } catch (error) {
    if (error instanceof Error && /timeout/i.test(error.message)) {
      throw new TimeoutError('Playwright timed out while rendering the product page.');
    }

    throw error;
  } finally {
    await browser.close();
  }
}
