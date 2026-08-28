export const CART_STORAGE_KEY = 'iwc-store-cart';
export const MAX_ITEM_QUANTITY = 99;
export const CHECKOUT_CURRENCY = 'USD';

export type CartLine = {
  slug: string;
  title: string;
  quality: string;
  price: number;
  quantity: number;
  image?: string;
  imageAlt?: string;
  compareAtPrice?: number;
};

export function cartLineId(line: Pick<CartLine, 'slug' | 'quality'>) {
  return `${line.slug}::${line.quality}`;
}

export function formatMoney(value: number, currency = CHECKOUT_CURRENCY) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
  }).format(value);
}

export function clampQuantity(quantity: number) {
  if (!Number.isFinite(quantity)) {
    return 1;
  }

  return Math.min(MAX_ITEM_QUANTITY, Math.max(1, Math.trunc(quantity)));
}

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.slug === 'string' &&
    typeof item.title === 'string' &&
    typeof item.quality === 'string' &&
    typeof item.price === 'number' &&
    Number.isFinite(item.price) &&
    typeof item.quantity === 'number'
  );
}

function normalizeLine(item: CartLine): CartLine {
  const compareAtPrice =
    typeof item.compareAtPrice === 'number' && Number.isFinite(item.compareAtPrice)
      ? item.compareAtPrice
      : undefined;

  return {
    slug: item.slug,
    title: item.title,
    quality: item.quality,
    price: item.price,
    quantity: clampQuantity(item.quantity),
    image: typeof item.image === 'string' ? item.image : undefined,
    imageAlt: typeof item.imageAlt === 'string' ? item.imageAlt : undefined,
    compareAtPrice,
  };
}

export function readCart(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isCartLine).map(normalizeLine);
  } catch {
    return [];
  }
}

export function writeCart(items: CartLine[]) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('iwc:cart-updated', { detail: { cart: items } }));
}

export function persistCartLine(line: CartLine) {
  if (!line.slug || !line.quality || line.quantity < 1 || !Number.isFinite(line.price)) {
    throw new Error('Invalid product selection');
  }

  const next = normalizeLine(line);
  const cart = readCart();
  const existing = cart.find((item) => item.slug === next.slug && item.quality === next.quality);

  if (existing) {
    existing.quantity = clampQuantity(existing.quantity + next.quantity);
    existing.price = next.price;
    existing.title = next.title;
    existing.image = next.image ?? existing.image;
    existing.imageAlt = next.imageAlt ?? existing.imageAlt;
    existing.compareAtPrice = next.compareAtPrice ?? existing.compareAtPrice;
  } else {
    cart.push(next);
  }

  writeCart(cart);
}

export function updateCartQuantity(id: string, quantity: number) {
  const cart =
    quantity < 1
      ? readCart().filter((item) => cartLineId(item) !== id)
      : readCart().map((item) =>
          cartLineId(item) === id ? { ...item, quantity: clampQuantity(quantity) } : item,
        );

  writeCart(cart);
}

export function removeCartLine(id: string) {
  writeCart(readCart().filter((item) => cartLineId(item) !== id));
}

export function cartSubtotal(items: CartLine[]) {
  return Math.round(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;
}

export function cartCompareAtTotal(items: CartLine[]) {
  return Math.round(
    items.reduce((sum, item) => sum + (item.compareAtPrice ?? item.price) * item.quantity, 0) * 100,
  ) / 100;
}
