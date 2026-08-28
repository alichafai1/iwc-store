import type { CheerioAPI } from 'cheerio';
import type { Specification } from '../schemas.js';

export type { Specification };

export interface AdapterDraft {
  title?: string;
  description?: string;
  price?: number | null;
  currency?: string | null;
  breadcrumbs: string[];
  specifications: Specification[];
  features: string[];
  collectionUrl?: string | null;
  collectionName?: string | null;
  model?: string | null;
  brand?: string | null;
  category?: string | null;
  primarySpecs: Specification[];
  additionalInformation: Specification[];
  raw: Record<string, unknown>;
}

export interface AdapterInput {
  url: URL;
  html: string;
  $: CheerioAPI;
}

export interface ProductAdapter {
  readonly id: string;
  matches(url: URL): boolean;
  extract(input: AdapterInput): AdapterDraft;
}

export interface DiscoveredProduct {
  url: string;
  title?: string;
  price?: number | null;
  currency?: string | null;
}

export interface CollectionPage {
  collectionName?: string;
  products: DiscoveredProduct[];
  nextPageUrls: string[];
}

export interface CollectionAdapter {
  readonly id: string;
  matches(url: URL): boolean;
  extractCollection(input: AdapterInput): CollectionPage;
}

export function emptyDraft(raw: Record<string, unknown> = {}): AdapterDraft {
  return {
    breadcrumbs: [],
    specifications: [],
    features: [],
    primarySpecs: [],
    additionalInformation: [],
    raw,
  };
}

export function firstText(...values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    const text = value?.replace(/\s+/g, ' ').trim();
    if (text) {
      return text;
    }
  }

  return undefined;
}

export function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const text = value?.replace(/\s+/g, ' ').trim();
    if (!text || seen.has(text.toLowerCase())) {
      continue;
    }

    seen.add(text.toLowerCase());
    result.push(text);
  }

  return result;
}

export function uniqueSpecs(values: Array<Specification | null | undefined>): Specification[] {
  const seen = new Set<string>();
  const result: Specification[] = [];

  for (const spec of values) {
    if (!spec) {
      continue;
    }

    const label = spec.label.replace(/\s+/g, ' ').trim().replace(/[:：]\s*$/, '');
    const value = spec.value.replace(/\s+/g, ' ').trim();
    if (!label || !value) {
      continue;
    }

    const key = `${label.toLowerCase()}::${value.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push({ label, value });
  }

  return result;
}

const CURRENCY_BY_SYMBOL: Record<string, string> = {
  '$': 'USD',
  '£': 'GBP',
  '€': 'EUR',
  '¥': 'JPY',
  '₹': 'INR',
  '₩': 'KRW',
  'A$': 'AUD',
  'C$': 'CAD',
  'US$': 'USD',
};

export function parsePrice(value: unknown): { price: number; currency?: string } | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { price: value };
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }

  const text = String(value).trim();
  if (!text) {
    return undefined;
  }

  let currency: string | undefined;
  for (const [symbol, code] of Object.entries(CURRENCY_BY_SYMBOL)) {
    if (text.includes(symbol)) {
      currency = code;
      break;
    }
  }

  const iso = text.match(/\b([A-Z]{3})\b/);
  if (iso) {
    currency = iso[1];
  }

  const numeric = text.replace(/[^\d.,-]/g, '').replace(/,(?=\d{3}\b)/g, '').replace(',', '.');
  const price = Number.parseFloat(numeric);
  if (!Number.isFinite(price)) {
    return undefined;
  }

  return { price, currency };
}

export function mergeDrafts(...drafts: AdapterDraft[]): AdapterDraft {
  const merged = emptyDraft();

  for (const draft of drafts) {
    merged.title = firstText(merged.title, draft.title);
    merged.description = firstText(merged.description, draft.description);
    if (merged.price == null && draft.price != null) {
      merged.price = draft.price;
    }
    merged.currency = firstText(merged.currency ?? undefined, draft.currency ?? undefined) ?? merged.currency;
    merged.breadcrumbs = uniqueStrings([...merged.breadcrumbs, ...draft.breadcrumbs]);
    merged.specifications = uniqueSpecs([...merged.specifications, ...draft.specifications]);
    merged.features = uniqueStrings([...merged.features, ...draft.features]);
    merged.collectionUrl = firstText(merged.collectionUrl ?? undefined, draft.collectionUrl ?? undefined) ?? merged.collectionUrl;
    merged.collectionName = firstText(merged.collectionName ?? undefined, draft.collectionName ?? undefined) ?? merged.collectionName;
    merged.model = firstText(merged.model ?? undefined, draft.model ?? undefined) ?? merged.model;
    merged.brand = firstText(merged.brand ?? undefined, draft.brand ?? undefined) ?? merged.brand;
    merged.category = firstText(merged.category ?? undefined, draft.category ?? undefined) ?? merged.category;
    merged.primarySpecs = uniqueSpecs([...merged.primarySpecs, ...draft.primarySpecs]);
    merged.additionalInformation = uniqueSpecs([
      ...merged.additionalInformation,
      ...draft.additionalInformation,
    ]);
    merged.raw = { ...merged.raw, ...draft.raw };
  }

  return merged;
}
