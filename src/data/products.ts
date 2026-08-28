import daVinci from '../assets/images/products/da-vinci-chronograph.svg';
import ingenieur from '../assets/images/products/ingenieur-automatic.svg';
import pilots from '../assets/images/products/pilots-utc.svg';
import portofino from '../assets/images/products/portofino-automatic.svg';
import { collections } from './collections';
import type { Product } from '../types/product';

const placeholderImages = [daVinci, ingenieur, pilots, portofino];

const placeholderTitles = [
  'Automatic',
  'Chronograph',
  'UTC',
  'Date',
  'Moon Phase',
  'Small Seconds',
  'Perpetual Calendar',
  'Tourbillon',
];

export const placeholderProducts: Product[] = [
  {
    slug: 'da-vinci-chronograph',
    title: 'Da Vinci Chronograph',
    collection: 'Da Vinci',
    collectionSlug: 'da-vinci',
    price: 6200,
    compareAtPrice: 7100,
    rating: 4.8,
    reviewCount: 12,
    image: daVinci,
    imageAlt: 'Da Vinci Chronograph placeholder',
  },
  {
    slug: 'ingenieur-automatic',
    title: 'Ingenieur Automatic',
    collection: 'Ingenieur',
    collectionSlug: 'ingenieur',
    price: 5400,
    rating: 4.7,
    reviewCount: 9,
    image: ingenieur,
    imageAlt: 'Ingenieur Automatic placeholder',
  },
  {
    slug: 'pilots-utc',
    title: 'Pilot UTC',
    collection: 'Pilots',
    collectionSlug: 'pilots',
    price: 4800,
    rating: 4.6,
    reviewCount: 7,
    image: pilots,
    imageAlt: 'Pilot UTC placeholder',
  },
  {
    slug: 'portofino-automatic',
    title: 'Portofino Automatic',
    collection: 'Portofino',
    collectionSlug: 'portofino',
    price: 3900,
    compareAtPrice: 4500,
    rating: 4.5,
    reviewCount: 5,
    image: portofino,
    imageAlt: 'Portofino Automatic placeholder',
  },
];

export function getCollectionPlaceholderProducts(slug: string): Product[] {
  const collection = collections.find((item) => item.slug === slug);

  if (!collection) {
    return [];
  }

  return placeholderTitles.map((suffix, index) => {
    const price = 3600 + index * 425;
    const onSale = index % 3 === 0;

    return {
      slug: `${collection.slug}-${suffix.toLowerCase().replaceAll(' ', '-')}`,
      title: `${collection.name} ${suffix}`,
      collection: collection.name,
      collectionSlug: collection.slug,
      price,
      compareAtPrice: onSale ? price + 700 : undefined,
      rating: Number((4.4 + (index % 5) * 0.1).toFixed(1)),
      reviewCount: 4 + (index % 8),
      image: placeholderImages[index % placeholderImages.length],
      imageAlt: `${collection.name} ${suffix} placeholder`,
    };
  });
}

export function getAllPlaceholderProducts(): Product[] {
  return collections.flatMap((collection) => getCollectionPlaceholderProducts(collection.slug));
}

export function getPlaceholderProduct(slug: string): Product | undefined {
  return getAllPlaceholderProducts().find((product) => product.slug === slug);
}

export function getRelatedProducts(slug: string, limit = 4): Product[] {
  const all = getAllPlaceholderProducts();
  const current = all.find((product) => product.slug === slug);
  const sameCollection = all.filter(
    (product) => product.slug !== slug && product.collectionSlug === current?.collectionSlug,
  );
  const otherCollections = all.filter(
    (product) => product.slug !== slug && product.collectionSlug !== current?.collectionSlug,
  );

  return [...sameCollection, ...otherCollections].slice(0, limit);
}
