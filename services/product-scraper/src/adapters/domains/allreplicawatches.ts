import {
  emptyDraft,
  firstText,
  mergeDrafts,
  parsePrice,
  uniqueStrings,
  type AdapterDraft,
  type AdapterInput,
  type CollectionAdapter,
  type CollectionPage,
  type DiscoveredProduct,
  type ProductAdapter,
} from '../types.js';
import { extractJsonLd } from '../extract/jsonld.js';
import { extractMeta } from '../extract/meta.js';
import { omitReviewFields } from '../extract/kv.js';
import { canonicalizeProductUrl, sourceDomain } from '../../url.js';
import { parseProductSpecifications } from './allreplicawatches-specs.js';

const DOMAIN = 'allreplicawatches.to';
const SKIP_PATH = /\/(cart|checkout|account|my-account|wishlist|contact|blog|login)(\/|$)/i;
const PAGE_PATH = /\/page\/\d+\/?$/i;

function isAllReplicaWatches(url: URL): boolean {
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
  if (!isAllReplicaWatches(url)) {
    return true;
  }

  if (url.searchParams.has('add-to-cart')) {
    return true;
  }

  if (url.pathname === collectionUrl.pathname) {
    return true;
  }

  if (SKIP_PATH.test(url.pathname) || PAGE_PATH.test(url.pathname)) {
    return true;
  }

  return false;
}

function productDescription(input: AdapterInput): string | undefined {
  const { $ } = input;
  const content = $('.elementor-widget-woocommerce-product-content .elementor-widget-container').first();
  if (!content.length) {
    return undefined;
  }

  const paragraphs: string[] = [];
  content.children().each((_, element) => {
    if ($(element).is('h2')) {
      return false;
    }

    if (!$(element).is('p')) {
      return;
    }

    const text = firstText($(element).text());
    if (text) {
      paragraphs.push(text);
    }
  });

  return paragraphs[0];
}

function jsonLdSku($: AdapterInput['$']): string | undefined {
  let sku: string | undefined;

  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const data = JSON.parse($(element).text()) as unknown;
      const graph =
        data && typeof data === 'object' && '@graph' in data
          ? (data as { '@graph'?: unknown })['@graph']
          : [];
      const nodes = Array.isArray(data) ? data : [data, ...(Array.isArray(graph) ? graph : [])];

      for (const node of nodes) {
        if (!node || typeof node !== 'object') {
          continue;
        }

        const record = node as { '@type'?: unknown; sku?: unknown };
        if (record['@type'] === 'Product' && typeof record.sku === 'string') {
          sku = record.sku;
          return false;
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  });

  return firstText(sku);
}

function modelFromTitle(title?: string): string | undefined {
  const match = title?.match(/\bIW[\d.]+\b/i);
  return match?.[0]?.toUpperCase();
}

function collectionFromBreadcrumbs(
  input: AdapterInput,
): Pick<AdapterDraft, 'breadcrumbs' | 'collectionUrl' | 'collectionName' | 'category' | 'brand'> {
  const { $, url } = input;
  const crumbs: Array<{ name: string; href?: string }> = [];

  $('.woocommerce-breadcrumb a[href]').each((_, element) => {
    const name = firstText($(element).text());
    const href = $(element).attr('href');
    if (name) {
      crumbs.push({ name, href });
    }
  });

  const breadcrumbs = uniqueStrings(
    crumbs.map((crumb) => crumb.name).filter((name) => !/^home$/i.test(name)),
  );

  const collectionCrumb = [...crumbs].reverse().find((crumb) => {
    const resolved = resolveHref(crumb.href, url);
    return Boolean(resolved && isAllReplicaWatches(resolved) && resolved.pathname !== url.pathname);
  });
  const collectionUrl = collectionCrumb?.href
    ? resolveHref(collectionCrumb.href, url)?.toString()
    : undefined;

  return {
    breadcrumbs,
    collectionUrl: collectionUrl ?? null,
    collectionName: collectionCrumb?.name ?? breadcrumbs[breadcrumbs.length - 1] ?? null,
    category: collectionCrumb?.name ?? null,
    brand: breadcrumbs.some((name) => /\biwc\b/i.test(name)) ? 'IWC' : null,
  };
}

export class AllReplicaWatchesAdapter implements ProductAdapter, CollectionAdapter {
  readonly id = 'allreplicawatches.to';

  matches(url: URL): boolean {
    return isAllReplicaWatches(url);
  }

  extractCollection(input: AdapterInput): CollectionPage {
    const { $, url } = input;
    const collectionName = firstText(
      $('h1.elementor-heading-title, h1.page-title, h1').first().text(),
      $('title').first().text(),
    );

    const products: DiscoveredProduct[] = [];
    const seen = new Set<string>();
    const cards = $('ul.products li.product');

    cards.each((_, element) => {
      const card = $(element);
      const titleLink = card
        .find('a.woocommerce-LoopProduct-link[href], a.woocommerce-loop-product__link[href]')
        .first();
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
        title: firstText(card.find('.woocommerce-loop-product__title').first().text(), titleLink.text()),
        price: listedPrice?.price ?? null,
        currency: listedPrice?.currency ?? null,
      });
    });

    const nextPageUrls: string[] = [];
    const pageSeen = new Set<string>([canonicalizeProductUrl(url.toString()).toString()]);
    $('a.page-numbers[href], .woocommerce-pagination a[href]').each((_, element) => {
      const resolved = resolveHref($(element).attr('href'), url);
      if (!resolved || !isAllReplicaWatches(resolved)) {
        return;
      }

      const canonical = resolved.toString();
      if (pageSeen.has(canonical) || !PAGE_PATH.test(resolved.pathname)) {
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
    const jsonld = extractJsonLd($);
    const meta = extractMeta($);
    const draft = emptyDraft({ adapter: this.id });
    const crumbs = collectionFromBreadcrumbs(input);
    const specifications = parseProductSpecifications(input);
    const amount = firstText(
      $('.price .woocommerce-Price-amount').first().text(),
      $('p.price').first().text(),
    );
    const parsedPrice = parsePrice(amount);
    const title = firstText($('h1.product_title, h1.entry-title, h1').first().text());
    const sku = firstText($('.sku').first().text(), jsonLdSku($));

    draft.title = title;
    draft.description = productDescription(input);
    draft.price = parsedPrice?.price ?? null;
    draft.currency = parsedPrice?.currency ?? null;
    draft.model = modelFromTitle(title) ?? sku ?? null;
    draft.brand = crumbs.brand;
    draft.category = crumbs.category;
    draft.collectionUrl = crumbs.collectionUrl;
    draft.collectionName = crumbs.collectionName;
    draft.breadcrumbs = crumbs.breadcrumbs;
    draft.primarySpecs = specifications;
    draft.specifications = specifications;
    draft.additionalInformation = specifications;
    draft.features = [];
    draft.raw = omitReviewFields({
      adapter: this.id,
      source_url: url.toString(),
      sku,
    });

    return mergeDrafts(jsonld, meta, draft);
  }
}
