import type { ImageMetadata } from 'astro';

export interface MediaItem {
  image: ImageMetadata;
  alt: string;
}
