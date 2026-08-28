import type { ImageMetadata } from 'astro';

export interface Author {
  slug: string;
  name: string;
  bio: string;
  image: ImageMetadata;
  imageAlt: string;
  role?: string;
}
