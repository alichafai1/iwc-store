import type { ImageMetadata } from 'astro';
import type { ProductMedia } from '../types/product';

export function mediaUrl(src: ProductMedia | ImageMetadata | string | null | undefined): string | undefined {
  if (!src) {
    return undefined;
  }

  return typeof src === 'string' ? src : src.src;
}

export function isRemoteMedia(src: ProductMedia): src is string {
  return typeof src === 'string';
}
