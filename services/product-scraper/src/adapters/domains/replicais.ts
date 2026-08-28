import type { Cheerio, CheerioAPI } from 'cheerio';
import type { AnyNode } from 'domhandler';
import {
  emptyDraft,
  firstText,
  parsePrice,
  uniqueSpecs,
  uniqueStrings,
  type AdapterDraft,
  type AdapterInput,
  type CollectionAdapter,
  type CollectionPage,
  type DiscoveredProduct,
  type ProductAdapter,
} from '../types.js';
import { omitReviewFields, parseLabeledBlob } from '../extract/kv.js';
import { canonicalizeProductUrl, sourceDomain } from '../../url.js';

const DOMAIN = 'replicais.com';
const SKIP_PATH = /\/(cart|contact|blog|login|wishlist|compare)(\.|\/|$)/i;
const COLLECTION_PATH = /-(replica|watches)\.html$/i;
const IDENTITY_LABELS = new Set(['model', 'brand', 'category']);

function isReplicais(url: URL): boolean {
  return sourceDomain(url) === DOMAIN;
}

function resolveHref(href: string | undefined, base: URL): URL | undefined {
  const value = href?.trim();
  if (!value || value.startsWith('#') || /^(javascript|mailto|tel):/i.test(value)) {
    return undefined;
  }

  try {
    return canonicalizeProductUrl(new URL(value, base).toString());
  } catch {
    return undefined;
  }
}

function isIgnoredCollectionLink(url: URL, collectionUrl: URL): boolean {
  if (!isReplicais(url)) {
    return true;
  }

  if (url.pathname === collectionUrl.pathname) {
    return true;
  }

  if (SKIP_PATH.test(url.pathname) || COLLECTION_PATH.test(url.pathname)) {
    return true;
  }

  return false;
}

function panelText($: CheerioAPI, panel: Cheerio<AnyNode>): string {
  const clone = panel.clone();
  clone.find('#reviews, #comments, .commentlist, .woocommerce-Reviews, script, style, noscript').remove();
  clone.find('h2').first().remove();
  clone.find('br').replaceWith('\n');

  const blocks: string[] = [];
  clone.find('p, li').each((_, element) => {
    const text = $(element).text().replace(/\s+/g, ' ').trim();
    if (text) {
      blocks.push(text);
    }
  });

  if (blocks.length > 0) {
    return blocks.join('\n\n');
  }

  return clone.text().replace(/\s+/g, ' ').trim();
}

function parseMetaFields($: CheerioAPI): {
  model?: string;
  brand?: string;
  category?: string;
  collectionUrl?: string;
  collectionName?: string;
  primarySpecs: AdapterDraft['primarySpecs'];
} {
  let model: string | undefined;
  let brand: string | undefined;
  let category: string | undefined;
  let collectionUrl: string | undefined;
  let collectionName: string | undefined;
  const primarySpecs: AdapterDraft['primarySpecs'] = [];

  $('.summary .product_meta .sku_wrapper, .summary .product_meta .posted_in').each((_, element) => {
    const node = $(element);
    const text = firstText(node.text()) ?? '';
    const separator = text.indexOf(':');
    const label =
      separator > 0
        ? text.slice(0, separator).replace(/\s+/g, ' ').trim()
        : '';
    const value = firstText(node.find('.sku, a').first().text(), separator > 0 ? text.slice(separator + 1) : '');
    if (!label || !value) {
      return;
    }

    const key = label.toLowerCase();
    if (key === 'model') {
      model = value;
      return;
    }

    if (key === 'brand') {
      brand = value;
      return;
    }

    if (key === 'category') {
      category = value;
      const href = node.find('a[href]').first().attr('href');
      try {
        if (href) {
          collectionUrl = canonicalizeProductUrl(new URL(href, 'https://www.replicais.com').toString()).toString();
          collectionName = value;
        }
      } catch {
        collectionName = value;
      }
      return;
    }

    if (IDENTITY_LABELS.has(key)) {
      return;
    }

    primarySpecs.push({ label, value });
  });

  return { model, brand, category, collectionUrl, collectionName, primarySpecs };
}

export class ReplicaisAdapter implements ProductAdapter, CollectionAdapter {
  readonly id = 'replicais.com';

  matches(url: URL): boolean {
    return isReplicais(url);
  }

  extractCollection(input: AdapterInput): CollectionPage {
    const { $, url } = input;
    const collectionName = firstText(
      $('h1.page-title, h1.entry-title, h1').first().text(),
      $('title').first().text(),
    );

    const products: DiscoveredProduct[] = [];
    const seen = new Set<string>();
    const grid = $('.products.elements-grid, .basel-products-holder').first();
    const cards = grid.length ? grid.find('.product-grid-item') : $.root().find('.product-grid-item');

    cards.each((_, element) => {
      const card = $(element);
      const titleLink = card.find('h3.product-title a[href], .woocommerce-loop-product__title a[href]').first();
      const resolved = resolveHref(titleLink.attr('href'), url);
      if (!resolved || isIgnoredCollectionLink(resolved, url)) {
        return;
      }

      const canonical = resolved.toString();
      if (seen.has(canonical)) {
        return;
      }

      seen.add(canonical);
      const listedPrice = parsePrice(
        firstText(
          card.find('.price .woocommerce-Price-amount').first().text(),
          card.find('.price').first().text(),
        ),
      );

      products.push({
        url: canonical,
        title: firstText(titleLink.text()),
        price: listedPrice?.price ?? null,
        currency: listedPrice?.currency ?? null,
      });
    });

    const nextPageUrls: string[] = [];
    const pageSeen = new Set<string>([canonicalizeProductUrl(url.toString()).toString()]);
    $('nav.woocommerce-pagination a.page-numbers, .woocommerce-pagination a.next').each((_, element) => {
      const resolved = resolveHref($(element).attr('href'), url);
      if (!resolved) {
        return;
      }

      const canonical = resolved.toString();
      if (pageSeen.has(canonical) || !isReplicais(resolved)) {
        return;
      }

      pageSeen.add(canonical);
      nextPageUrls.push(canonical);
    });

    return {
      collectionName,
      products,
      nextPageUrls,
    };
  }

  extract(input: AdapterInput): AdapterDraft {
    const { $, url } = input;
    const draft = emptyDraft({ adapter: this.id });
    const meta = parseMetaFields($);
    const additionalPanel = $('#tab-additional_information').first();
    const descriptionPanel = $('#tab-description').first();
    const additionalText = additionalPanel.length ? panelText($, additionalPanel) : '';
    const additionalInformation = uniqueSpecs(parseLabeledBlob(additionalText, true));

    const amount = firstText(
      $('.summary input[name="amount"]').attr('value'),
      $('.summary .price .woocommerce-Price-amount').first().text(),
    );
    const parsedPrice = parsePrice(amount);
    const currency =
      parsedPrice?.currency ??
      (firstText($('.summary .woocommerce-Price-currencySymbol').first().text()) === '$' ? 'USD' : undefined);

    draft.title = firstText(
      $('h1.product_title, .product_title, h1').first().text(),
    );
    draft.description = descriptionPanel.length ? panelText($, descriptionPanel) : undefined;
    draft.price = parsedPrice?.price ?? null;
    draft.currency = currency ?? parsedPrice?.currency ?? null;
    draft.model = meta.model ?? null;
    draft.brand = meta.brand ?? null;
    draft.category = meta.category ?? null;
    draft.collectionUrl = meta.collectionUrl ?? null;
    draft.collectionName = meta.collectionName ?? null;
    draft.primarySpecs = uniqueSpecs(meta.primarySpecs);
    draft.specifications = uniqueSpecs([...meta.primarySpecs, ...additionalInformation]);
    draft.additionalInformation = additionalInformation;
    draft.breadcrumbs = uniqueStrings([meta.brand, meta.category]);
    draft.features = [];
    draft.raw = omitReviewFields({
      adapter: this.id,
      source_url: url.toString(),
      additional_information_text: additionalText || undefined,
      product_meta: firstText($('.summary .product_meta').text()),
    });

    return draft;
  }
}
