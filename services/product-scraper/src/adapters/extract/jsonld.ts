import type { CheerioAPI } from 'cheerio';
import {
  emptyDraft,
  firstText,
  parsePrice,
  uniqueSpecs,
  uniqueStrings,
  type AdapterDraft,
  type Specification,
} from '../types.js';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value == null) {
    return [];
  }

  return [value];
}

function typeNames(value: unknown): string[] {
  const record = asRecord(value);
  if (!record) {
    return [];
  }

  return asArray(record['@type']).map((item) => String(item).toLowerCase());
}

function flattenGraph(value: unknown): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];

  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    const record = asRecord(node);
    if (!record) {
      return;
    }

    nodes.push(record);
    if (record['@graph']) {
      visit(record['@graph']);
    }
  };

  visit(value);
  return nodes;
}

function textValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return firstText(value);
  }

  const record = asRecord(value);
  if (record) {
    return firstText(
      typeof record.name === 'string' ? record.name : undefined,
      typeof record.text === 'string' ? record.text : undefined,
      typeof record['@value'] === 'string' ? record['@value'] : undefined,
    );
  }

  return undefined;
}

function offerFields(product: Record<string, unknown>): { price?: number; currency?: string } {
  const offers = asArray(product.offers).map(asRecord).filter(Boolean) as Record<string, unknown>[];
  for (const offer of offers) {
    const parsed = parsePrice(offer.price ?? offer.lowPrice ?? offer.highPrice);
    const currency =
      typeof offer.priceCurrency === 'string' ? offer.priceCurrency : parsed?.currency;
    if (parsed) {
      return { price: parsed.price, currency };
    }
  }

  return {};
}

function additionalProperties(product: Record<string, unknown>): Specification[] {
  return uniqueSpecs(
    asArray(product.additionalProperty).map((item) => {
      const record = asRecord(item);
      if (!record) {
        return null;
      }

      const label = textValue(record.name);
      const value = textValue(record.value);
      if (!label || !value) {
        return null;
      }

      return { label, value };
    }),
  );
}

export function extractJsonLd($: CheerioAPI): AdapterDraft {
  const products: Record<string, unknown>[] = [];
  const parsed: unknown[] = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    const text = $(element).text().trim();
    if (!text) {
      return;
    }

    try {
      const data = JSON.parse(text) as unknown;
      parsed.push(data);
      for (const node of flattenGraph(data)) {
        if (typeNames(node).some((name) => name.includes('product'))) {
          products.push(node);
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  });

  const product = products[0];
  if (!product) {
    return emptyDraft({ jsonld: parsed });
  }

  const offer = offerFields(product);
  const breadcrumbs = uniqueStrings(
    flattenGraph(parsed)
      .filter((node) => typeNames(node).some((name) => name.includes('listitem')))
      .map((node) => textValue(node.name) ?? textValue(node.item)),
  );

  return {
    ...emptyDraft({ jsonld: parsed }),
    title: textValue(product.name),
    description: textValue(product.description),
    price: offer.price ?? null,
    currency: offer.currency ?? null,
    breadcrumbs,
    specifications: additionalProperties(product),
    features: uniqueStrings(asArray(product.featureList).map(textValue)),
    raw: { jsonld: parsed },
  };
}
