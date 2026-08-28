import { collections, storeCollections } from '../data/collections';
import { getProductPage, getProductPages } from '../data/product-pages';
import type { Collection } from '../types/collection';

export function getCollections(): Collection[] {
  return [...collections];
}

export function getStoreCollections(): Collection[] {
  return [...storeCollections];
}

export function getCollectionBySlug(slug: string): Collection | undefined {
  return storeCollections.find((collection) => collection.slug === slug);
}

export function getOtherCollections(slug: string): Collection[] {
  return collections.filter((collection) => collection.slug !== slug);
}

export { getProductPage, getProductPages };
