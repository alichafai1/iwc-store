import { PRODUCT_IMAGE_BUCKET, COLLECTION_IMAGE_BUCKET, SITE_ASSETS_BUCKET } from './admin/constants';
import { publicStorageUrl } from './admin/storage';
import { supabase } from './supabase';
import { DEFAULT_QUALITY, sortProductQualities, startingQuality } from './qualities';
import {
  isMerchandisingCollectionSlug,
  isModelCollectionSlug,
  sortCollectionsByStoreOrder,
  storeCollections,
} from '../data/collections';
import { collectionImages, getCollectionImage } from '../data/collection-media';
import type { CollectionPageData } from '../types/collection';
import type { Product, ProductImage, ProductPageData, ProductQuality } from '../types/product';
import type { Tables } from '../types/database';
import type { ImageMetadata } from 'astro';
import { getCollectionBySlug, getOtherCollections } from './content';

type ProductRow = Tables<'products'>;
type CatalogProductRow = ProductRow & { collections: CollectionName | null };
type CollectionName = Pick<Tables<'collections'>, 'name' | 'slug'>;
type QualityRow = Tables<'product_qualities'>;
type ImageRow = Tables<'product_images'>;
type SpecRow = Tables<'product_specs'>;
type FeatureRow = Tables<'product_features'>;
type ReviewRow = Tables<'product_reviews'>;
type FaqRow = Tables<'product_faqs'>;

function moneyValue(value: number | string | null | undefined): number | undefined {
  if (value == null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function qualityChoices(rows: QualityRow[] | undefined): ProductQuality[] {
  return sortProductQualities(rows)
    .filter((row) => row.quality === DEFAULT_QUALITY)
    .flatMap((row) => {
      const price = moneyValue(row.price);
      if (price === undefined) {
        return [];
      }

      return [
        {
          id: row.quality,
          label: row.quality,
          price,
          compareAtPrice: moneyValue(row.compare_at_price),
        },
      ];
    });
}

function startingPrice(rows: QualityRow[] | undefined): { price: number; compareAtPrice?: number } {
  const start = startingQuality(rows);
  return {
    price: moneyValue(start?.price) ?? 0,
    compareAtPrice: moneyValue(start?.compare_at_price),
  };
}

function splitParagraphs(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function formatReviewDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function groupBy<T>(rows: T[] | null | undefined, key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows ?? []) {
    const id = key(row);
    const current = map.get(id);
    if (current) {
      current.push(row);
    } else {
      map.set(id, [row]);
    }
  }
  return map;
}

function sortByPosition<T extends { position: number }>(rows: T[] | null | undefined): T[] {
  return [...(rows ?? [])].sort((a, b) => a.position - b.position);
}

function sortProductImages(rows: ImageRow[] | null | undefined): ImageRow[] {
  return sortByPosition(rows).sort((a, b) => {
    if (a.is_primary !== b.is_primary) {
      return a.is_primary ? -1 : 1;
    }

    return a.position - b.position;
  });
}

function catalogProductCard(
  row: CatalogProductRow,
  images: ImageRow[] | undefined,
  qualities: QualityRow[] | undefined,
  reviews: ReviewRow[] | undefined,
  collectionFallback?: CollectionName,
): Product {
  const ordered = sortProductImages(images);
  const pricing = startingPrice(qualities);
  const reviewRows = sortByPosition(reviews);
  const primaryImage = ordered[0];
  const imageUrl = publicStorageUrl(PRODUCT_IMAGE_BUCKET, primaryImage?.storage_path);

  return {
    slug: row.slug,
    title: row.title,
    collection: row.collections?.name || collectionFallback?.name || '',
    collectionSlug: row.collections?.slug || collectionFallback?.slug || '',
    price: pricing.price,
    compareAtPrice: pricing.compareAtPrice,
    rating: averageRating(reviewRows.map((review) => review.rating)),
    reviewCount: reviewRows.length,
    image: imageUrl ?? '',
    imageAlt: primaryImage?.alt_text || row.title,
    sku: row.sku ?? undefined,
  };
}

function catalogGalleryImages(images: ImageRow[] | undefined, fallbackAlt: string): ProductImage[] {
  return sortProductImages(images)
    .map((image) => {
      const src = publicStorageUrl(PRODUCT_IMAGE_BUCKET, image.storage_path);
      if (!src) {
        return null;
      }

      return {
        src,
        alt: image.alt_text || fallbackAlt,
      };
    })
    .filter((image): image is { src: string; alt: string } => Boolean(image));
}

function catalogProductPage(
  row: CatalogProductRow,
  product: Product,
  images: ImageRow[] | undefined,
  qualities: QualityRow[] | undefined,
  specs: SpecRow[] | undefined,
  features: FeatureRow[] | undefined,
  reviews: ReviewRow[] | undefined,
  faqs: FaqRow[] | undefined,
): ProductPageData {
  const aboutParagraphs = splitParagraphs(row.description);

  return {
    source: 'catalog',
    product,
    path: `/products/${row.slug}/`,
    metaTitle: row.meta_title || row.title,
    metaDescription: row.meta_description || row.short_description || aboutParagraphs[0] || row.title,
    images: catalogGalleryImages(images, row.title),
    qualities: qualityChoices(qualities),
    specs: sortByPosition(specs).map((spec) => ({
      label: spec.label,
      value: spec.value,
    })),
    about: {
      heading: row.about_heading?.trim() || 'About Product',
      paragraphs: aboutParagraphs,
    },
    features: sortByPosition(features).map((feature) => feature.feature_text),
    reviews: sortByPosition(reviews).map((review) => ({
      title: review.title,
      author: review.customer_name,
      date: formatReviewDate(review.review_date),
      rating: review.rating,
      body: review.review_text,
    })),
    faqs: sortByPosition(faqs).map((faq) => ({
      question: faq.question,
      answer: faq.answer,
    })),
    currency: 'USD',
    sku: row.sku ?? undefined,
    availability: 'https://schema.org/InStock',
  };
}

function averageRating(ratings: number[]): number {
  if (ratings.length === 0) {
    return 0;
  }

  return Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10;
}

function hasValidProductImage(images: ImageRow[] | null | undefined): boolean {
  return sortProductImages(images).some((image) => Boolean(image.storage_path?.trim()));
}

function hasAssignedCollection(
  row: Pick<ProductRow, 'primary_collection_id'>,
  collectionIds: string[] = [],
): boolean {
  return Boolean(row.primary_collection_id) || collectionIds.length > 0;
}

function isStorefrontProduct(
  row: Pick<ProductRow, 'status' | 'primary_collection_id'>,
  images: ImageRow[] | null | undefined,
  collectionIds: string[] = [],
): boolean {
  return row.status === 'published' && hasValidProductImage(images) && hasAssignedCollection(row, collectionIds);
}

function productSlugFromPath(href: string): string | null {
  const match = href.trim().match(/^\/products\/([^/]+)\/?$/);
  return match?.[1] ?? null;
}

export async function getStorefrontProductSlugs(slugs?: string[]): Promise<string[]> {
  let query = supabase
    .from('products')
    .select('id, slug, primary_collection_id')
    .eq('status', 'published');

  if (slugs) {
    const unique = [...new Set(slugs.filter(Boolean))];
    if (unique.length === 0) {
      return [];
    }
    query = query.in('slug', unique);
  }

  const { data: products, error } = await query;
  if (error) {
    console.error('Failed to load storefront product slugs:', error.message);
    return [];
  }

  const rows = products ?? [];
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((row) => row.id);
  const [imagesResult, joinsResult] = await Promise.all([
    supabase.from('product_images').select('product_id, storage_path').in('product_id', ids),
    supabase.from('product_collections').select('product_id').in('product_id', ids),
  ]);

  if (imagesResult.error) {
    console.error('Failed to load storefront product images:', imagesResult.error.message);
    return [];
  }

  if (joinsResult.error) {
    console.error('Failed to load storefront product collections:', joinsResult.error.message);
    return [];
  }

  const imageIds = new Set(
    (imagesResult.data ?? [])
      .filter((image) => Boolean(image.storage_path?.trim()))
      .map((image) => image.product_id),
  );
  const joinIds = new Set((joinsResult.data ?? []).map((join) => join.product_id));

  return rows
    .filter((row) => imageIds.has(row.id) && (row.primary_collection_id || joinIds.has(row.id)))
    .map((row) => row.slug);
}

export async function getPublishedCatalogPages(): Promise<
  { page: ProductPageData; relatedProducts: Product[] }[]
> {
  const { data: products, error } = await supabase
    .from('products')
    .select('*, collections:primary_collection_id(name, slug)')
    .eq('status', 'published')
    .order('title');

  if (error) {
    console.error('Failed to load published catalog products:', error.message);
    return [];
  }

  const rows = (products ?? []) as Array<ProductRow & { collections: CollectionName | null }>;
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((row) => row.id);
  const [
    imagesResult,
    qualitiesResult,
    specsResult,
    featuresResult,
    reviewsResult,
    faqsResult,
    joinsResult,
  ] = await Promise.all([
    supabase.from('product_images').select('*').in('product_id', ids).order('position'),
    supabase.from('product_qualities').select('*').in('product_id', ids),
    supabase.from('product_specs').select('*').in('product_id', ids).order('position'),
    supabase.from('product_features').select('*').in('product_id', ids).order('position'),
    supabase
      .from('product_reviews')
      .select('*')
      .in('product_id', ids)
      .eq('status', 'published')
      .order('position'),
    supabase.from('product_faqs').select('*').in('product_id', ids).order('position'),
    supabase.from('product_collections').select('product_id, collection_id').in('product_id', ids),
  ]);

  const childError =
    imagesResult.error?.message ||
    qualitiesResult.error?.message ||
    specsResult.error?.message ||
    featuresResult.error?.message ||
    reviewsResult.error?.message ||
    faqsResult.error?.message ||
    joinsResult.error?.message;

  if (childError) {
    console.error('Failed to load published catalog product details:', childError);
    return [];
  }

  const imagesByProduct = groupBy(imagesResult.data, (row) => row.product_id);
  const qualitiesByProduct = groupBy(qualitiesResult.data, (row) => row.product_id);
  const specsByProduct = groupBy(specsResult.data, (row) => row.product_id);
  const featuresByProduct = groupBy(featuresResult.data, (row) => row.product_id);
  const reviewsByProduct = groupBy(reviewsResult.data, (row) => row.product_id);
  const faqsByProduct = groupBy(faqsResult.data, (row) => row.product_id);
  const collectionIdsByProduct = new Map<string, string[]>();

  for (const join of joinsResult.data ?? []) {
    const current = collectionIdsByProduct.get(join.product_id) ?? [];
    current.push(join.collection_id);
    collectionIdsByProduct.set(join.product_id, current);
  }

  const publicRows = rows.filter((row) =>
    isStorefrontProduct(row, imagesByProduct.get(row.id), collectionIdsByProduct.get(row.id) ?? []),
  );

  const cards = new Map<string, Product>();

  for (const row of publicRows) {
    cards.set(
      row.id,
      catalogProductCard(
        row,
        imagesByProduct.get(row.id),
        qualitiesByProduct.get(row.id),
        reviewsByProduct.get(row.id),
      ),
    );
  }

  return publicRows.map((row) => {
    const product = cards.get(row.id)!;
    const collectionIds = new Set(collectionIdsByProduct.get(row.id) ?? []);
    if (row.primary_collection_id) {
      collectionIds.add(row.primary_collection_id);
    }

    const relatedProducts = publicRows
      .filter((candidate) => candidate.id !== row.id)
      .filter((candidate) => {
        const candidateCollections = new Set(collectionIdsByProduct.get(candidate.id) ?? []);
        if (candidate.primary_collection_id) {
          candidateCollections.add(candidate.primary_collection_id);
        }
        return [...collectionIds].some((id) => candidateCollections.has(id));
      })
      .map((candidate) => cards.get(candidate.id)!)
      .filter((candidate) => candidate.image)
      .slice(0, 4);

    const fallbackRelated = [...cards.values()]
      .filter((candidate) => candidate.slug !== product.slug && candidate.image)
      .slice(0, 4);

    return {
      page: catalogProductPage(
        row,
        product,
        imagesByProduct.get(row.id),
        qualitiesByProduct.get(row.id),
        specsByProduct.get(row.id),
        featuresByProduct.get(row.id),
        reviewsByProduct.get(row.id),
        faqsByProduct.get(row.id),
      ),
      relatedProducts: relatedProducts.length > 0 ? relatedProducts : fallbackRelated,
    };
  });
}

export async function getPublishedProductsForCollection(slug: string): Promise<Product[]> {
  const { data: collection, error: collectionError } = await supabase
    .from('collections')
    .select('id, name, slug')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (collectionError) {
    console.error('Failed to load collection:', collectionError.message);
    return [];
  }

  if (!collection) {
    return [];
  }

  const { data: joins, error: joinError } = await supabase
    .from('product_collections')
    .select('product_id, position')
    .eq('collection_id', collection.id)
    .order('position');

  if (joinError) {
    console.error('Failed to load collection products:', joinError.message);
    return [];
  }

  const orderedIds = [...new Set((joins ?? []).map((row) => row.product_id))];
  if (orderedIds.length === 0) {
    return [];
  }

  const { data: products, error } = await supabase
    .from('products')
    .select('*, collections:primary_collection_id(name, slug)')
    .in('id', orderedIds)
    .eq('status', 'published');

  if (error) {
    console.error('Failed to load published collection products:', error.message);
    return [];
  }

  const rows = (products ?? []) as Array<ProductRow & { collections: CollectionName | null }>;
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((row) => row.id);
  const [imagesResult, qualitiesResult, reviewsResult] = await Promise.all([
    supabase.from('product_images').select('*').in('product_id', ids).order('position'),
    supabase.from('product_qualities').select('*').in('product_id', ids),
    supabase
      .from('product_reviews')
      .select('*')
      .in('product_id', ids)
      .eq('status', 'published')
      .order('position'),
  ]);

  const childError =
    imagesResult.error?.message || qualitiesResult.error?.message || reviewsResult.error?.message;
  if (childError) {
    console.error('Failed to load collection product details:', childError);
    return [];
  }

  const imagesByProduct = groupBy(imagesResult.data, (row) => row.product_id);
  const qualitiesByProduct = groupBy(qualitiesResult.data, (row) => row.product_id);
  const reviewsByProduct = groupBy(reviewsResult.data, (row) => row.product_id);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const seenSlugs = new Set<string>();

  return orderedIds
    .map((id) => byId.get(id))
    .filter((row): row is ProductRow & { collections: CollectionName | null } => Boolean(row))
    .filter((row) => {
      if (seenSlugs.has(row.slug)) {
        return false;
      }
      seenSlugs.add(row.slug);
      return isStorefrontProduct(row, imagesByProduct.get(row.id), [collection.id]);
    })
    .map((row) =>
      catalogProductCard(
        row,
        imagesByProduct.get(row.id),
        qualitiesByProduct.get(row.id),
        reviewsByProduct.get(row.id),
        collection,
      ),
    )
    .filter((product) => Boolean(product.image));
}

export async function getPublishedProductPage(slug: string): Promise<{
  page: ProductPageData;
  relatedProducts: Product[];
} | null> {
  const { data: product, error } = await supabase
    .from('products')
    .select('*, collections:primary_collection_id(name, slug)')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    console.error('Failed to load published product:', error.message);
    return null;
  }

  if (!product) {
    return null;
  }

  const row = product as CatalogProductRow;
  const [
    imagesResult,
    qualitiesResult,
    specsResult,
    featuresResult,
    reviewsResult,
    faqsResult,
    joinsResult,
  ] = await Promise.all([
    supabase.from('product_images').select('*').eq('product_id', row.id).order('position'),
    supabase.from('product_qualities').select('*').eq('product_id', row.id),
    supabase.from('product_specs').select('*').eq('product_id', row.id).order('position'),
    supabase.from('product_features').select('*').eq('product_id', row.id).order('position'),
    supabase
      .from('product_reviews')
      .select('*')
      .eq('product_id', row.id)
      .eq('status', 'published')
      .order('position'),
    supabase.from('product_faqs').select('*').eq('product_id', row.id).order('position'),
    supabase.from('product_collections').select('collection_id').eq('product_id', row.id),
  ]);

  const childError =
    imagesResult.error?.message ||
    qualitiesResult.error?.message ||
    specsResult.error?.message ||
    featuresResult.error?.message ||
    reviewsResult.error?.message ||
    faqsResult.error?.message ||
    joinsResult.error?.message;

  if (childError) {
    console.error('Failed to load published product details:', childError);
    return null;
  }

  const collectionIds = (joinsResult.data ?? []).map((join) => join.collection_id);
  if (!isStorefrontProduct(row, imagesResult.data, collectionIds)) {
    return null;
  }

  const catalogProduct = catalogProductCard(
    row,
    imagesResult.data ?? undefined,
    qualitiesResult.data ?? undefined,
    reviewsResult.data ?? undefined,
  );
  const page = catalogProductPage(
    row,
    catalogProduct,
    imagesResult.data ?? undefined,
    qualitiesResult.data ?? undefined,
    specsResult.data ?? undefined,
    featuresResult.data ?? undefined,
    reviewsResult.data ?? undefined,
    faqsResult.data ?? undefined,
  );

  const collectionSlug = catalogProduct.collectionSlug;
  const relatedProducts = collectionSlug
    ? (await getPublishedProductsForCollection(collectionSlug))
        .filter((item) => item.slug !== row.slug && Boolean(item.image))
        .slice(0, 4)
    : [];

  return { page, relatedProducts };
}

export interface PublishedStoreCollection {
  name: string;
  slug: string;
  description: string | null;
  image_path: string | null;
  image_alt: string | null;
}

export interface StoreCollectionCard {
  name: string;
  slug: string;
  href: string;
  image: ImageMetadata | string;
  imageAlt: string;
}

export async function getPublishedStoreCollections(): Promise<PublishedStoreCollection[]> {
  const { data, error } = await supabase
    .from('collections')
    .select('name, slug, description, image_path, image_alt')
    .eq('status', 'published');

  if (error) {
    console.error('Failed to load published collections:', error.message);
    return storeCollections.map((collection) => ({
      name: collection.name,
      slug: collection.slug,
      description: null,
      image_path: null,
      image_alt: null,
    }));
  }

  const bySlug = new Map((data ?? []).map((row) => [row.slug, row]));

  return sortCollectionsByStoreOrder(
    storeCollections.map((collection) => {
      const row = bySlug.get(collection.slug);
      return {
        name: row?.name ?? collection.name,
        slug: collection.slug,
        description: row?.description ?? null,
        image_path: row?.image_path ?? null,
        image_alt: row?.image_alt ?? null,
      };
    }),
  );
}

function collectionCardImage(
  collection: PublishedStoreCollection,
  productCover?: string,
): ImageMetadata | string {
  const stored = publicStorageUrl(COLLECTION_IMAGE_BUCKET, collection.image_path);
  if (stored) {
    return stored;
  }

  const local = collectionImages[collection.slug];
  if (local) {
    return local;
  }

  if (productCover) {
    return productCover;
  }

  return getCollectionImage(collection.slug);
}

export async function getPublishedStoreCollectionCards(): Promise<StoreCollectionCard[]> {
  const collections = await getPublishedStoreCollections();
  const merch = collections.filter((collection) => !isModelCollectionSlug(collection.slug));
  const covers = new Map<string, string>();

  await Promise.all(
    merch.map(async (collection) => {
      const products = await getPublishedProductsForCollection(collection.slug);
      const cover = products.find((product) => product.image)?.image;
      if (typeof cover === 'string' && cover) {
        covers.set(collection.slug, cover);
      }
    }),
  );

  return collections.map((collection) => ({
    name: collection.name,
    slug: collection.slug,
    href: `/collections/${collection.slug}/`,
    image: collectionCardImage(collection, covers.get(collection.slug)),
    imageAlt: collection.image_alt?.trim() || `${collection.name} collection`,
  }));
}

export interface CollectionHubSection extends StoreCollectionCard {
  products: Product[];
}

export interface ShopProduct extends Product {
  collectionSlugs: string[];
}

export async function getPublishedShopProducts(): Promise<ShopProduct[]> {
  const { data: products, error } = await supabase
    .from('products')
    .select('*, collections:primary_collection_id(name, slug)')
    .eq('status', 'published')
    .order('title');

  if (error) {
    console.error('Failed to load shop products:', error.message);
    return [];
  }

  const rows = (products ?? []) as Array<ProductRow & { collections: CollectionName | null }>;
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((row) => row.id);
  const [imagesResult, qualitiesResult, reviewsResult, joinsResult, collectionsResult] = await Promise.all([
    supabase.from('product_images').select('*').in('product_id', ids).order('position'),
    supabase.from('product_qualities').select('*').in('product_id', ids),
    supabase
      .from('product_reviews')
      .select('*')
      .in('product_id', ids)
      .eq('status', 'published')
      .order('position'),
    supabase.from('product_collections').select('product_id, collection_id').in('product_id', ids),
    supabase.from('collections').select('id, slug').eq('status', 'published'),
  ]);

  const childError =
    imagesResult.error?.message ||
    qualitiesResult.error?.message ||
    reviewsResult.error?.message ||
    joinsResult.error?.message ||
    collectionsResult.error?.message;

  if (childError) {
    console.error('Failed to load shop product details:', childError);
    return [];
  }

  const imagesByProduct = groupBy(imagesResult.data, (row) => row.product_id);
  const qualitiesByProduct = groupBy(qualitiesResult.data, (row) => row.product_id);
  const reviewsByProduct = groupBy(reviewsResult.data, (row) => row.product_id);
  const collectionIdsByProduct = new Map<string, string[]>();
  const slugByCollectionId = new Map((collectionsResult.data ?? []).map((row) => [row.id, row.slug]));

  for (const join of joinsResult.data ?? []) {
    const current = collectionIdsByProduct.get(join.product_id) ?? [];
    current.push(join.collection_id);
    collectionIdsByProduct.set(join.product_id, current);
  }

  return rows
    .filter((row) =>
      isStorefrontProduct(row, imagesByProduct.get(row.id), collectionIdsByProduct.get(row.id) ?? []),
    )
    .map((row) => {
      const card = catalogProductCard(
        row,
        imagesByProduct.get(row.id),
        qualitiesByProduct.get(row.id),
        reviewsByProduct.get(row.id),
      );
      const slugs = new Set<string>();
      if (row.collections?.slug) {
        slugs.add(row.collections.slug);
      }
      for (const collectionId of collectionIdsByProduct.get(row.id) ?? []) {
        const slug = slugByCollectionId.get(collectionId);
        if (slug) {
          slugs.add(slug);
        }
      }

      return {
        ...card,
        collectionSlugs: [...slugs],
      };
    })
    .filter((product) => Boolean(product.image));
}

export async function getCollectionHubSections(limit = 6): Promise<CollectionHubSection[]> {
  const collections = (await getPublishedStoreCollectionCards()).filter(
    (collection) => !isMerchandisingCollectionSlug(collection.slug),
  );
  const productLists = await Promise.all(
    collections.map((collection) => getPublishedProductsForCollection(collection.slug)),
  );

  return collections
    .map((collection, index) => ({
      ...collection,
      products: (productLists[index] ?? []).slice(0, limit),
    }))
    .sort((left, right) => Number(right.products.length > 0) - Number(left.products.length > 0));
}

function nonempty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

type RelatedCollectionRow = {
  position: number;
  anchor_text: string | null;
  context: string | null;
  related: CollectionName | null;
};

type PopularModelRow = {
  position: number;
  product: { title: string; slug: string } | null;
};

type ComparisonRow = {
  position: number;
  body: string | null;
  compared: CollectionName | null;
};

export async function getPublishedCollectionPage(slug: string): Promise<CollectionPageData | null> {
  if (!getCollectionBySlug(slug)) {
    return null;
  }

  const { data: row, error } = await supabase
    .from('collections')
    .select(
      'id, name, slug, description, seo_content, seo_intro, about_content, overview_content, history_content, models_guide_heading, models_guide_content, buying_guide_content, comparison_content, related_intro, faq_heading, why_choose_heading, why_choose_content, h1, meta_title, meta_description, image_path, image_alt',
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    console.error('Failed to load collection page:', error.message);
    return null;
  }

  if (!row) {
    return null;
  }

  const [featuresResult, faqsResult, relatedResult, comparisonResult, linkResult, popularResult] = await Promise.all([
    supabase
      .from('collection_features')
      .select('feature_text, position')
      .eq('collection_id', row.id)
      .order('position'),
    supabase
      .from('collection_faqs')
      .select('question, answer, position')
      .eq('collection_id', row.id)
      .order('position'),
    supabase
      .from('collection_related_collections')
      .select('position, anchor_text, context, related:related_collection_id(name, slug)')
      .eq('collection_id', row.id)
      .order('position'),
    supabase
      .from('collection_comparisons')
      .select('position, body, compared:compared_collection_id(name, slug)')
      .eq('collection_id', row.id)
      .order('position'),
    supabase
      .from('collection_internal_links')
      .select('label, href, position')
      .eq('collection_id', row.id)
      .order('position'),
    supabase
      .from('collection_popular_models')
      .select('position, product:product_id(title, slug)')
      .eq('collection_id', row.id)
      .order('position'),
  ]);

  const childError =
    featuresResult.error?.message ||
    faqsResult.error?.message ||
    relatedResult.error?.message ||
    comparisonResult.error?.message ||
    linkResult.error?.message ||
    popularResult.error?.message;

  if (childError) {
    console.error('Failed to load collection SEO sections:', childError);
  }

  const intro = nonempty(row.seo_intro) ?? nonempty(row.description);
  const overview = nonempty(row.overview_content) ?? nonempty(row.about_content) ?? nonempty(row.seo_content);
  const relatedLinks = sortByPosition((relatedResult.data as RelatedCollectionRow[] | null) ?? [])
    .flatMap((item) => {
      if (!item.related) {
        return [];
      }

      return [
        {
          name: item.related.name,
          slug: item.related.slug,
          href: `/collections/${item.related.slug}/`,
          label: nonempty(item.anchor_text) ?? item.related.name,
          context: nonempty(item.context),
        },
      ];
    })
    .filter((item, index, items) => items.findIndex((candidate) => candidate.slug === item.slug) === index);
  const otherCollections =
    relatedLinks.length > 0
      ? relatedLinks.map((item) => ({ name: item.name, slug: item.slug }))
      : getOtherCollections(row.slug);
  const comparisonItems = sortByPosition((comparisonResult.data as ComparisonRow[] | null) ?? []).flatMap((item) => {
    if (!item.compared) {
      return [];
    }

    return [
      {
        name: item.compared.name,
        slug: item.compared.slug,
        href: `/collections/${item.compared.slug}/`,
        body: nonempty(item.body),
      },
    ];
  });
  const popularModels = sortByPosition((popularResult.data as PopularModelRow[] | null) ?? []).flatMap((item) => {
    if (!item.product) {
      return [];
    }

    return [
      {
        name: item.product.title,
        slug: item.product.slug,
        href: `/products/${item.product.slug}/`,
      },
    ];
  });
  const internalLinks = sortByPosition(linkResult.data).map((link) => ({
    label: link.label,
    href: link.href,
  }));
  const productSlugsToCheck = [
    ...popularModels.map((model) => model.slug),
    ...internalLinks.flatMap((link) => {
      const slug = productSlugFromPath(link.href);
      return slug ? [slug] : [];
    }),
  ];
  const storefrontSlugs = new Set(await getStorefrontProductSlugs(productSlugsToCheck));

  return {
    collection: { name: row.name, slug: row.slug },
    heading: nonempty(row.h1) ?? row.name,
    path: `/collections/${row.slug}/`,
    intro,
    metaTitle: nonempty(row.meta_title) ?? row.name,
    metaDescription: nonempty(row.meta_description) ?? intro ?? row.name,
    image: publicStorageUrl(COLLECTION_IMAGE_BUCKET, row.image_path),
    imageAlt: nonempty(row.image_alt) ?? `${row.name} collection`,
    overviewParagraphs: splitParagraphs(overview),
    historyParagraphs: splitParagraphs(row.history_content),
    modelsGuideHeading: nonempty(row.models_guide_heading),
    modelsGuideParagraphs: splitParagraphs(row.models_guide_content),
    buyingGuideParagraphs: splitParagraphs(row.buying_guide_content),
    comparisonParagraphs: splitParagraphs(row.comparison_content),
    comparisonItems,
    features: sortByPosition(featuresResult.data)
      .map((feature) => feature.feature_text.trim())
      .filter(Boolean),
    faqs: sortByPosition(faqsResult.data).map((faq) => ({
      question: faq.question,
      answer: faq.answer,
    })),
    faqHeading: nonempty(row.faq_heading),
    whyChooseHeading: nonempty(row.why_choose_heading),
    whyChooseParagraphs: splitParagraphs(row.why_choose_content),
    relatedIntro: nonempty(row.related_intro),
    relatedLinks,
    popularModels: popularModels.filter((model) => storefrontSlugs.has(model.slug)),
    internalLinks: internalLinks.filter((link) => {
      const slug = productSlugFromPath(link.href);
      return !slug || storefrontSlugs.has(slug);
    }),
    otherCollections,
  };
}

export async function getPublishedCustomerReviewScreenshots(): Promise<Array<{ src: string; alt: string }>> {
  const { data, error } = await supabase
    .from('customer_review_screenshots')
    .select('storage_path, alt')
    .eq('status', 'published')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Failed to load customer review screenshots:', error.message);
    return [];
  }

  return (data ?? []).flatMap((row) => {
    const src = publicStorageUrl(SITE_ASSETS_BUCKET, row.storage_path);
    if (!src) {
      return [];
    }

    return [{ src, alt: row.alt }];
  });
}
