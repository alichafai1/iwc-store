export const PRODUCT_QUALITIES = ['Top 1:1 Clone'] as const;

export type ProductQualityName = (typeof PRODUCT_QUALITIES)[number];

export const DEFAULT_QUALITY: ProductQualityName = 'Top 1:1 Clone';

export function isProductQualityName(value: string): value is ProductQualityName {
  return (PRODUCT_QUALITIES as readonly string[]).includes(value);
}

export function sortProductQualities<T extends { quality: string }>(rows: T[] | null | undefined): T[] {
  const list = rows ?? [];
  return PRODUCT_QUALITIES.flatMap((quality) => {
    const row = list.find((item) => item.quality === quality);
    return row ? [row] : [];
  });
}

export function startingQuality<T extends { quality: string }>(rows: T[] | null | undefined): T | undefined {
  const ordered = sortProductQualities(rows);
  return ordered.find((row) => row.quality === DEFAULT_QUALITY) ?? ordered[0];
}

export function hasCompleteQualityPrices(
  rows: Array<{ quality: string; price: number | string | null }>,
): boolean {
  const row = rows.find((item) => item.quality === DEFAULT_QUALITY);
  if (!row || row.price == null || row.price === '') {
    return false;
  }

  const price = Number(row.price);
  return Number.isFinite(price) && price >= 0;
}
