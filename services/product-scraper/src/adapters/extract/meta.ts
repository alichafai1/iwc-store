import type { CheerioAPI } from 'cheerio';
import { emptyDraft, firstText, parsePrice, type AdapterDraft } from '../types.js';

function content($: CheerioAPI, selectors: string[]): string | undefined {
  for (const selector of selectors) {
    const value = firstText($(selector).attr('content'));
    if (value) {
      return value;
    }
  }

  return undefined;
}

export function extractMeta($: CheerioAPI): AdapterDraft {
  const title = content($, [
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
    'meta[name="title"]',
  ]);
  const description = content($, [
    'meta[property="og:description"]',
    'meta[name="description"]',
    'meta[name="twitter:description"]',
  ]);
  const priceText = content($, [
    'meta[property="product:price:amount"]',
    'meta[property="og:price:amount"]',
    'meta[itemprop="price"]',
  ]);
  const currency = content($, [
    'meta[property="product:price:currency"]',
    'meta[property="og:price:currency"]',
    'meta[itemprop="priceCurrency"]',
  ]);
  const parsed = parsePrice(priceText);

  return {
    ...emptyDraft({
      meta: {
        title,
        description,
        price: priceText,
        currency,
      },
    }),
    title,
    description,
    price: parsed?.price ?? null,
    currency: firstText(currency, parsed?.currency) ?? null,
  };
}
