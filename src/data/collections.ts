import type { Collection } from '../types/collection';

export const collections: Collection[] = [
  { slug: 'da-vinci', name: 'Da Vinci' },
  { slug: 'ingenieur', name: 'Ingenieur' },
  { slug: 'mark-series', name: 'Mark Series' },
  { slug: 'pilots', name: 'Pilots' },
  { slug: 'portofino', name: 'Portofino' },
  { slug: 'portuguese', name: 'Portuguese' },
  { slug: 'spitfire', name: 'Spitfire' },
  { slug: 'big-pilot', name: 'Big Pilot' },
  { slug: 'top-gun', name: 'Top Gun' },
  { slug: 'aquatimer', name: 'Aquatimer' },
];

export const merchandisingCollections: Collection[] = [
  { slug: 'best-sellers', name: 'Best Sellers' },
  { slug: 'new-arrivals', name: 'New Arrivals' },
];

export const unlistedModelCollections: Collection[] = [
  { slug: 'anniversary-series', name: 'Anniversary Series' },
];

export const storeCollections: Collection[] = [...collections, ...merchandisingCollections];

export const MODEL_COLLECTION_SLUGS = [
  ...collections.map((collection) => collection.slug),
  ...unlistedModelCollections.map((collection) => collection.slug),
];
export const BEST_SELLERS_SLUG = 'best-sellers';
export const NEW_ARRIVALS_SLUG = 'new-arrivals';

export function isStorefrontModelCollectionSlug(slug: string): boolean {
  return collections.some((collection) => collection.slug === slug);
}

export function isModelCollectionSlug(slug: string): boolean {
  return MODEL_COLLECTION_SLUGS.includes(slug);
}

export function isMerchandisingCollectionSlug(slug: string): boolean {
  return slug === BEST_SELLERS_SLUG || slug === NEW_ARRIVALS_SLUG;
}

export function collectionPath(slug: string): string {
  return `/collections/${slug}/`;
}

export function sortCollectionsByStoreOrder<T extends { slug: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const left = storeCollections.findIndex((collection) => collection.slug === a.slug);
    const right = storeCollections.findIndex((collection) => collection.slug === b.slug);
    return (left === -1 ? storeCollections.length : left) - (right === -1 ? storeCollections.length : right);
  });
}
