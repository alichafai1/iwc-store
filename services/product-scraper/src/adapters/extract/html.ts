import type { CheerioAPI } from 'cheerio';
import {
  emptyDraft,
  firstText,
  parsePrice,
  uniqueSpecs,
  uniqueStrings,
  type AdapterDraft,
} from '../types.js';

const TITLE_SELECTORS = [
  'h1',
  '[itemprop="name"]',
  '.product-title',
  '.product__title',
  '.product-name',
  '#productTitle',
];

const DESCRIPTION_SELECTORS = [
  '[itemprop="description"]',
  '.product-description',
  '.product__description',
  '#productDescription',
  '.product-single__description',
];

const PRICE_SELECTORS = [
  '[itemprop="price"]',
  '.product-price',
  '.product__price',
  '.price_color',
  '.current-price',
  '.price',
];

const BREADCRUMB_SELECTORS = [
  'nav[aria-label="breadcrumb" i] a',
  'nav[aria-label="breadcrumbs" i] a',
  '.breadcrumb a',
  '.breadcrumbs a',
  '[itemtype*="BreadcrumbList" i] [itemprop="name"]',
];

const FEATURE_SELECTORS = [
  '.product-features li',
  '.product__features li',
  '.features li',
  '#feature-bullets li',
];

function textOf($: CheerioAPI, selectors: string[]): string | undefined {
  for (const selector of selectors) {
    const value = firstText($(selector).first().text());
    if (value) {
      return value;
    }
  }

  return undefined;
}

function collect($: CheerioAPI, selectors: string[]): string[] {
  const values: string[] = [];

  for (const selector of selectors) {
    $(selector).each((_, element) => {
      values.push($(element).text());
    });
  }

  return uniqueStrings(values);
}

export function extractHtml($: CheerioAPI): AdapterDraft {
  const specifications = uniqueSpecs([
    ...$('table tr')
      .toArray()
      .map((row) => {
        const cells = $(row).find('th, td');
        if (cells.length < 2) {
          return null;
        }

        return {
          label: $(cells[0]).text(),
          value: $(cells[1]).text(),
        };
      }),
    ...$('dl')
      .toArray()
      .flatMap((list) => {
        const items: Array<{ label: string; value: string }> = [];
        const dts = $(list).find('dt');
        dts.each((index, dt) => {
          items.push({
            label: $(dt).text(),
            value: $(dt).nextAll('dd').first().text(),
          });
        });
        return items;
      }),
  ]);

  const parsedPrice = parsePrice(
    firstText(
      $('[itemprop="price"]').attr('content'),
      $('[itemprop="price"]').attr('data-price'),
      textOf($, PRICE_SELECTORS),
    ),
  );

  return {
    ...emptyDraft({ html: { title: textOf($, TITLE_SELECTORS) } }),
    title: firstText(textOf($, TITLE_SELECTORS), $('title').first().text()),
    description: textOf($, DESCRIPTION_SELECTORS),
    price: parsedPrice?.price ?? null,
    currency: parsedPrice?.currency ?? null,
    breadcrumbs: collect($, BREADCRUMB_SELECTORS).filter(
      (item) => !/^home$/i.test(item) && item.toLowerCase() !== 'products',
    ),
    specifications,
    features: collect($, FEATURE_SELECTORS),
  };
}
