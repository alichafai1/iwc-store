import { BEST_SELLERS_SLUG } from '../data/collections';
import type { Product } from '../types/product';
import {
  getPublishedCustomerReviewScreenshots,
  getPublishedModelCollectionCards,
  getPublishedProductsForCollection,
  type StoreCollectionCard,
} from './catalog';

const HOMEPAGE_CATALOG_TTL_MS = 60_000;

export type HomepageCatalogData = {
  collections: StoreCollectionCard[];
  homepageBestSellers: Product[];
  reviewScreenshots: Array<{ src: string; alt: string }>;
};

type CacheEntry = {
  data: HomepageCatalogData;
  expiresAt: number;
};

let cache: CacheEntry | null = null;
let inflight: Promise<HomepageCatalogData> | null = null;

async function loadHomepageCatalogData(): Promise<HomepageCatalogData> {
  const [collections, homepageBestSellers, reviewScreenshots] = await Promise.all([
    getPublishedModelCollectionCards(),
    getPublishedProductsForCollection(BEST_SELLERS_SLUG, { limit: 8 }),
    getPublishedCustomerReviewScreenshots(),
  ]);

  return {
    collections,
    homepageBestSellers,
    reviewScreenshots,
  };
}

/** Cached homepage catalog payload with 60s TTL and in-flight dedupe. */
export async function getHomepageCatalogData(): Promise<HomepageCatalogData> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.data;
  }

  if (inflight) {
    return inflight;
  }

  inflight = loadHomepageCatalogData()
    .then((data) => {
      cache = {
        data,
        expiresAt: Date.now() + HOMEPAGE_CATALOG_TTL_MS,
      };
      return data;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
