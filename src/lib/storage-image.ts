const OBJECT_PUBLIC_PATH = '/storage/v1/object/public/';
const RENDER_PUBLIC_PATH = '/storage/v1/render/image/public/';
const MIN_SIZE = 1;
const MAX_SIZE = 2500;
const DEFAULT_QUALITY = 80;

export const PRODUCT_CARD_IMAGE = {
  widths: [320, 480, 640, 800],
  width: 800,
  height: 800,
  sizes: '(min-width: 64em) 25vw, 50vw',
} as const;

export const PRODUCT_GALLERY_IMAGE = {
  widths: [480, 640, 720, 800, 960, 1200],
  width: 900,
  height: 900,
  // Understate mobile slot (~72vw vs full bleed) so 3x phones prefer 800–960w over 1200w.
  sizes: '(min-width: 64em) 42vw, (min-width: 48em) 50vw, 72vw',
} as const;

export const PRODUCT_GALLERY_THUMB = {
  widths: [80, 160, 240],
  width: 160,
  height: 160,
  sizes: '84px',
} as const;

export const COLLECTION_COVER_THUMB = {
  widths: [160, 240, 320],
  width: 320,
  height: 400,
  sizes: '10rem',
} as const;

export const COLLECTION_HUB_IMAGE = {
  widths: [480, 720, 960, 1200],
  width: 960,
  height: 1200,
  sizes: '(min-width: 64em) 36vw, 100vw',
} as const;

export const COLLECTION_CARD_IMAGE = {
  widths: [320, 480, 640, 800],
  width: 800,
  height: 1000,
  sizes: '(min-width: 64em) 22vw, (min-width: 48em) 33vw, 70vw',
} as const;

export const ARTICLE_CARD_IMAGE = {
  widths: [480, 720, 960, 1080],
  width: 1080,
  height: 1080,
  sizes: '(min-width: 64em) 33vw, (min-width: 48em) 50vw, 100vw',
} as const;

export const ARTICLE_HERO_IMAGE = {
  widths: [640, 800, 960, 1080],
  width: 1080,
  height: 1080,
  sizes: '(min-width: 64em) 42rem, 100vw',
} as const;

export const REVIEW_GALLERY_IMAGE = {
  widths: [280, 360, 480, 640],
  width: 480,
  height: 1024,
  sizes: '(min-width: 48em) 18rem, 16.5rem',
  resize: 'contain' as const,
} as const;

export const HERO_PROOF_IMAGE = {
  widths: [64, 96, 128],
  width: 96,
  height: 112,
  sizes: '2.1rem',
} as const;

export const PRODUCT_STICKY_THUMB = {
  widths: [48, 96],
  width: 96,
  height: 96,
  sizes: '44px',
} as const;

export const CHECKOUT_THUMB_IMAGE = {
  width: 128,
  height: 128,
  quality: 80,
} as const;

export const QC_VIDEO_THUMB = {
  widths: [320, 480, 640],
  width: 640,
  height: 480,
  sizes: '(min-width: 64em) 22vw, (min-width: 48em) 40vw, 100vw',
} as const;

export const ABOUT_STORY_IMAGE = {
  widths: [480, 640, 800],
  width: 800,
  height: 1000,
  sizes: '(min-width: 64em) 28rem, 100vw',
} as const;

export const DELIVERY_PROOF_IMAGE = {
  widths: [360, 480, 640, 750],
  width: 750,
  height: 1400,
  sizes: '(min-width: 64em) 14rem, 45vw',
} as const;

export const BOX_OFFER_IMAGE = {
  widths: [240, 360, 480, 640],
  width: 480,
  height: 480,
  sizes: '(min-width: 64em) 16vw, 40vw',
} as const;

export type StorageImageFormat = 'origin' | 'webp' | 'avif';

export interface StorageImageTransform {
  width: number;
  height?: number;
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
  format?: StorageImageFormat;
}

function clampSize(value: number): number {
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(value)));
}

function renderBaseUrl(source: string): string | null {
  const withoutQuery = source.split('?')[0] ?? source;
  const objectIndex = withoutQuery.indexOf(OBJECT_PUBLIC_PATH);
  if (objectIndex !== -1) {
    return `${withoutQuery.slice(0, objectIndex)}${RENDER_PUBLIC_PATH}${withoutQuery.slice(
      objectIndex + OBJECT_PUBLIC_PATH.length,
    )}`;
  }

  if (withoutQuery.includes(RENDER_PUBLIC_PATH)) {
    return withoutQuery;
  }

  return null;
}

export function isSupabaseStorageUrl(source: string): boolean {
  return renderBaseUrl(source) !== null;
}

export function transformedStorageUrl(
  source: string | null | undefined,
  options: StorageImageTransform,
): string | null {
  if (!source) {
    return null;
  }

  const base = renderBaseUrl(source);
  if (!base) {
    return source;
  }

  const params = new URLSearchParams();
  params.set('width', String(clampSize(options.width)));
  if (options.height) {
    params.set('height', String(clampSize(options.height)));
  }
  params.set('quality', String(options.quality ?? DEFAULT_QUALITY));
  params.set('resize', options.resize ?? 'cover');
  if (options.format && options.format !== 'origin') {
    params.set('format', options.format);
  }
  return `${base}?${params.toString()}`;
}

export function storageImageSrcSet(
  source: string,
  widths: readonly number[],
  options: Omit<StorageImageTransform, 'width'> & { heightRatio?: number } = {},
): string | undefined {
  if (!isSupabaseStorageUrl(source)) {
    return undefined;
  }

  const heightRatio =
    typeof options.heightRatio === 'number' && Number.isFinite(options.heightRatio) && options.heightRatio > 0
      ? options.heightRatio
      : options.height && options.width
        ? options.height / options.width
        : 1;

  const entries = widths.flatMap((width) => {
    const size = clampSize(width);
    const height = clampSize(size * heightRatio);
    const url = transformedStorageUrl(source, {
      ...options,
      width: size,
      height,
    });
    return url ? [`${url} ${size}w`] : [];
  });

  return entries.length > 0 ? entries.join(', ') : undefined;
}

/** Preload hint matching OptimizedRemoteImage gallery `<picture>` WebP srcset/sizes. */
export interface GalleryLcpPreload {
  href: string;
  imagesrcset: string;
  imagesizes: string;
  type: 'image/webp';
}

/**
 * LCP preload for product gallery — WebP matches the first `<source>` in
 * OptimizedRemoteImage when `formats` prefers webp (often smaller than AVIF for photos).
 */
export function buildGalleryLcpPreload(source: string): GalleryLcpPreload | null {
  if (!isSupabaseStorageUrl(source)) {
    return null;
  }

  const heightRatio = PRODUCT_GALLERY_IMAGE.height / PRODUCT_GALLERY_IMAGE.width;
  const imagesrcset = storageImageSrcSet(source, PRODUCT_GALLERY_IMAGE.widths, {
    heightRatio,
    format: 'webp',
    resize: 'cover',
  });
  if (!imagesrcset) {
    return null;
  }

  // Fallback href for clients without imagesrcset-on-preload (≈ common mobile pick).
  const href =
    transformedStorageUrl(source, {
      width: 960,
      height: 960,
      format: 'webp',
      resize: 'cover',
    }) ?? source;

  return {
    href,
    imagesrcset,
    imagesizes: PRODUCT_GALLERY_IMAGE.sizes,
    type: 'image/webp',
  };
}
