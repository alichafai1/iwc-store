const OBJECT_PUBLIC_PATH = '/storage/v1/object/public/';
const RENDER_PUBLIC_PATH = '/storage/v1/render/image/public/';
const MIN_SIZE = 1;
const MAX_SIZE = 2500;
const DEFAULT_QUALITY = 75;

export const PRODUCT_CARD_IMAGE = {
  widths: [320, 480, 640, 800],
  width: 800,
  height: 800,
  sizes: '(min-width: 64em) 25vw, 50vw',
} as const;

export const PRODUCT_GALLERY_IMAGE = {
  widths: [480, 720, 960, 1200],
  width: 900,
  height: 900,
  sizes: '(min-width: 64em) 42vw, 100vw',
} as const;

export const PRODUCT_GALLERY_THUMB = {
  widths: [80, 160, 240],
  width: 160,
  height: 160,
  sizes: '84px',
} as const;

export const COLLECTION_HUB_IMAGE = {
  widths: [480, 720, 960, 1200],
  width: 960,
  height: 1200,
  sizes: '(min-width: 64em) 36vw, 100vw',
} as const;

export interface StorageImageTransform {
  width: number;
  height?: number;
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
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
  return `${base}?${params.toString()}`;
}

export function storageImageSrcSet(
  source: string,
  widths: readonly number[],
  options: Omit<StorageImageTransform, 'width' | 'height'> = {},
): string | undefined {
  if (!isSupabaseStorageUrl(source)) {
    return undefined;
  }

  const entries = widths.flatMap((width) => {
    const size = clampSize(width);
    const url = transformedStorageUrl(source, { ...options, width: size, height: size });
    return url ? [`${url} ${size}w`] : [];
  });

  return entries.length > 0 ? entries.join(', ') : undefined;
}
