import { collectionAdapters, domainAdapters } from './domains/index.js';
import { GenericProductAdapter } from './generic.js';
import type { CollectionAdapter, ProductAdapter } from './types.js';

const genericAdapter = new GenericProductAdapter();

export function resolveAdapter(url: URL): ProductAdapter {
  return domainAdapters.find((adapter) => adapter.matches(url)) ?? genericAdapter;
}

export function resolveCollectionAdapter(url: URL): CollectionAdapter | undefined {
  return collectionAdapters.find((adapter) => adapter.matches(url));
}

export function registeredAdapterIds(): string[] {
  return [...domainAdapters.map((adapter) => adapter.id), genericAdapter.id];
}
