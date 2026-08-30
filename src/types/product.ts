import type { ImageMetadata } from 'astro';
import type { FaqItem } from './faq';

export type ProductMedia = ImageMetadata | string;

export interface Product {
  slug: string;
  title: string;
  collection: string;
  collectionSlug: string;
  price: number;
  compareAtPrice?: number;
  rating: number;
  reviewCount: number;
  image: ProductMedia;
  imageAlt: string;
  sku?: string;
}

export interface ProductImage {
  src: ProductMedia;
  alt: string;
}

export interface ProductQuality {
  id: string;
  label: string;
  price: number;
  compareAtPrice?: number;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface ProductReview {
  title: string;
  author: string;
  date: string;
  rating: number;
  body: string;
}

export interface ProductAbout {
  heading: string;
  paragraphs: string[];
  sections?: {
    heading: string;
    paragraphs: string[];
  }[];
}

export interface ProductPageData {
  source?: 'placeholder' | 'catalog';
  product: Product;
  path: string;
  metaTitle: string;
  metaDescription: string;
  images: ProductImage[];
  qualities: ProductQuality[];
  specs: ProductSpec[];
  about: ProductAbout;
  features: string[];
  reviews: ProductReview[];
  faqs: FaqItem[];
  currency: string;
  sku?: string;
  availability?: string;
  brand?: string;
}
