import {
  MAX_ITEM_QUANTITY,
  CART_STORAGE_KEY,
  cartLineId,
  cartQuantityCount,
  cartSubtotal,
  formatMoney,
  openCartDrawer,
  persistCartLine,
  readCart,
  removeCartLine,
  updateCartQuantity,
  type CartLine,
} from '../lib/cart';
import { CHECKOUT_THUMB_IMAGE, transformedStorageUrl } from '../lib/storage-image';
import { DEFAULT_QUALITY } from '../lib/qualities';

const BOX_OFFER_STORAGE_KEY = 'iwc-store-box-offer';
const FALLBACK_BOX_HREF = '/products/iwc-box-and-papers-wbox-4/';

type BoxOfferCache = {
  slug: string;
  title: string;
  quality: string;
  price: number;
  image?: string;
  imageAlt?: string;
  href: string;
  priceLabel: string;
};

let lastFocus: HTMLElement | null = null;
let escapeBound = false;

function drawerRoot() {
  return document.querySelector<HTMLElement>('[data-cart-drawer]');
}

function thumbUrl(src: string | undefined) {
  if (!src) {
    return '';
  }
  return (
    transformedStorageUrl(src, {
      width: CHECKOUT_THUMB_IMAGE.width,
      height: CHECKOUT_THUMB_IMAGE.height,
      quality: CHECKOUT_THUMB_IMAGE.quality,
      format: 'webp',
      resize: 'cover',
    }) ?? src
  );
}

function readCachedBoxOffer(): BoxOfferCache | null {
  try {
    const raw = window.sessionStorage.getItem(BOX_OFFER_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as BoxOfferCache;
    if (!parsed?.slug || !parsed.title || !Number.isFinite(parsed.price)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedBoxOffer(offer: BoxOfferCache) {
  try {
    window.sessionStorage.setItem(BOX_OFFER_STORAGE_KEY, JSON.stringify(offer));
  } catch {
    // Ignore quota / private mode.
  }
}

function boxOfferFromPage(): BoxOfferCache | null {
  const card = document.querySelector<HTMLElement>('[data-box-offer]');
  if (!card) {
    return null;
  }

  const price = Number(card.dataset.boxPrice);
  const slug = card.dataset.boxSlug?.trim() ?? '';
  const title = card.dataset.boxTitle?.trim() ?? '';
  const quality = card.dataset.boxQuality?.trim() || DEFAULT_QUALITY;
  const href =
    card.querySelector<HTMLAnchorElement>('a[href*="/products/"]')?.getAttribute('href') ||
    (slug ? `/products/${slug}/` : FALLBACK_BOX_HREF);
  const priceLabel =
    card.querySelector('.box-offer__price')?.textContent?.trim() || formatMoney(price);

  if (!slug || !title || !Number.isFinite(price)) {
    return null;
  }

  const offer: BoxOfferCache = {
    slug,
    title,
    quality,
    price,
    image: card.dataset.boxImage || undefined,
    imageAlt: card.dataset.boxImageAlt || undefined,
    href,
    priceLabel,
  };
  writeCachedBoxOffer(offer);
  return offer;
}

function resolveBoxOffer(): BoxOfferCache | null {
  return boxOfferFromPage() ?? readCachedBoxOffer();
}

function syncHeaderBadge(items: CartLine[]) {
  const count = cartQuantityCount(items);
  document.querySelectorAll<HTMLElement>('[data-cart-count]').forEach((badge) => {
    badge.textContent = String(count);
    badge.hidden = count < 1;
    badge.setAttribute('aria-hidden', count < 1 ? 'true' : 'false');
  });

  document.querySelectorAll<HTMLElement>('[data-cart-open]').forEach((trigger) => {
    trigger.setAttribute('aria-label', count > 0 ? `Cart, ${count} items` : 'Cart');
  });
}

function renderItems(root: HTMLElement, items: CartLine[]) {
  const list = root.querySelector('[data-cart-items]');
  const template = root.querySelector<HTMLTemplateElement>('[data-cart-item-template]');
  const empty = root.querySelector<HTMLElement>('[data-cart-empty]');
  if (!list || !template) {
    return;
  }

  list.replaceChildren();

  if (items.length === 0) {
    empty?.removeAttribute('hidden');
    return;
  }

  empty?.setAttribute('hidden', '');

  items.forEach((item) => {
    const node = template.content.firstElementChild?.cloneNode(true);
    if (!(node instanceof HTMLElement)) {
      return;
    }

    const id = cartLineId(item);
    const href = `/products/${item.slug}/`;
    const image = node.querySelector<HTMLImageElement>('[data-item-image]');
    const title = node.querySelector('[data-item-title]');
    const quality = node.querySelector('[data-item-quality]');
    const price = node.querySelector('[data-item-price]');
    const compare = node.querySelector<HTMLElement>('[data-item-compare]');
    const qty = node.querySelector('[data-item-qty]');
    const decrease = node.querySelector<HTMLButtonElement>('[data-qty-delta="-1"]');
    const increase = node.querySelector<HTMLButtonElement>('[data-qty-delta="1"]');
    const remove = node.querySelector<HTMLButtonElement>('[data-item-remove]');

    node.querySelectorAll<HTMLAnchorElement>('[data-item-link]').forEach((link) => {
      link.href = href;
    });

    if (image) {
      if (item.image) {
        image.src = thumbUrl(item.image);
        image.alt = item.imageAlt || item.title;
      } else {
        image.remove();
      }
    }

    if (title) {
      title.textContent = item.title;
    }
    if (quality) {
      quality.textContent = item.quality;
    }
    if (price) {
      price.textContent = formatMoney(item.price);
    }
    if (compare) {
      if (item.compareAtPrice && item.compareAtPrice > item.price) {
        compare.hidden = false;
        compare.textContent = formatMoney(item.compareAtPrice);
      } else {
        compare.hidden = true;
      }
    }
    if (qty) {
      qty.textContent = String(item.quantity);
    }
    if (decrease) {
      decrease.setAttribute('aria-label', `Decrease quantity of ${item.title}`);
      decrease.addEventListener('click', () => updateCartQuantity(id, item.quantity - 1));
    }
    if (increase) {
      increase.setAttribute('aria-label', `Increase quantity of ${item.title}`);
      increase.disabled = item.quantity >= MAX_ITEM_QUANTITY;
      increase.addEventListener('click', () => updateCartQuantity(id, item.quantity + 1));
    }
    if (remove) {
      remove.addEventListener('click', () => removeCartLine(id));
    }

    list.append(node);
  });
}

function syncBoxUpsell(root: HTMLElement, items: CartLine[]) {
  const upsell = root.querySelector<HTMLElement>('[data-cart-box-upsell]');
  if (!upsell) {
    return;
  }

  const offer = resolveBoxOffer();
  if (!offer || items.some((item) => item.slug === offer.slug)) {
    upsell.hidden = true;
    return;
  }

  upsell.hidden = false;
  upsell.dataset.boxSlug = offer.slug;
  upsell.dataset.boxTitle = offer.title;
  upsell.dataset.boxQuality = offer.quality;
  upsell.dataset.boxPrice = String(offer.price);
  upsell.dataset.boxImage = offer.image ?? '';
  upsell.dataset.boxImageAlt = offer.imageAlt ?? '';

  const image = upsell.querySelector<HTMLImageElement>('[data-cart-box-image]');
  if (image) {
    if (offer.image) {
      image.src = thumbUrl(offer.image) || offer.image;
      image.alt = offer.imageAlt || offer.title;
      image.hidden = false;
    } else {
      image.hidden = true;
    }
  }

  const price = upsell.querySelector('[data-cart-box-price]');
  if (price) {
    price.textContent = offer.priceLabel;
  }

  const view = upsell.querySelector<HTMLAnchorElement>('[data-cart-box-view]');
  if (view) {
    view.href = offer.href;
  }
}

function renderDrawer(root: HTMLElement, items = readCart()) {
  const qty = cartQuantityCount(items);
  root.querySelectorAll('[data-cart-drawer-qty]').forEach((node) => {
    node.textContent = String(qty);
  });
  root.querySelectorAll('[data-cart-subtotal]').forEach((node) => {
    node.textContent = formatMoney(cartSubtotal(items));
  });

  const checkout = root.querySelector<HTMLAnchorElement>('[data-cart-checkout]');
  if (checkout) {
    checkout.classList.toggle('is-disabled', items.length === 0);
    checkout.setAttribute('aria-disabled', items.length === 0 ? 'true' : 'false');
    if (items.length === 0) {
      checkout.setAttribute('tabindex', '-1');
    } else {
      checkout.removeAttribute('tabindex');
    }
  }

  renderItems(root, items);
  syncBoxUpsell(root, items);
}

function isOpen(root: HTMLElement) {
  return root.classList.contains('is-open') && !root.hasAttribute('hidden');
}

function closeDrawer() {
  const root = drawerRoot();
  if (!root || !isOpen(root)) {
    return;
  }

  root.classList.remove('is-open');
  root.setAttribute('hidden', '');
  document.body.classList.remove('cart-drawer-open');
  document.body.style.removeProperty('overflow');

  if (lastFocus) {
    lastFocus.focus();
    lastFocus = null;
  }
}

function openDrawer() {
  const root = drawerRoot();
  if (!root) {
    return;
  }

  renderDrawer(root, readCart());
  lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  root.hidden = false;
  root.getBoundingClientRect();
  root.classList.add('is-open');
  document.body.classList.add('cart-drawer-open');
  document.body.style.overflow = 'hidden';
  root.querySelector<HTMLElement>('[data-cart-panel]')?.focus();
}

async function addBoxFromDrawer(root: HTMLElement, button: HTMLButtonElement) {
  if (button.disabled || button.getAttribute('data-box-busy') === 'true') {
    return;
  }

  const upsell = root.querySelector<HTMLElement>('[data-cart-box-upsell]');
  if (!upsell || upsell.hidden) {
    return;
  }

  const price = Number(upsell.dataset.boxPrice);
  const slug = upsell.dataset.boxSlug?.trim() ?? '';
  const title = upsell.dataset.boxTitle?.trim() ?? '';
  const quality = upsell.dataset.boxQuality?.trim() || DEFAULT_QUALITY;

  if (!slug || !title || !Number.isFinite(price)) {
    return;
  }

  const idle = button.getAttribute('data-idle-label') ?? 'Add Box';
  button.setAttribute('data-box-busy', 'true');
  button.disabled = true;
  button.textContent = 'Adding...';

  try {
    persistCartLine({
      slug,
      title,
      quality,
      price,
      quantity: 1,
      image: upsell.dataset.boxImage || undefined,
      imageAlt: upsell.dataset.boxImageAlt || undefined,
    });
    button.textContent = 'Added ✓';
    window.setTimeout(() => {
      button.textContent = idle;
      button.disabled = false;
      button.removeAttribute('data-box-busy');
    }, 900);
  } catch {
    button.textContent = 'Couldn’t add';
    window.setTimeout(() => {
      button.textContent = idle;
      button.disabled = false;
      button.removeAttribute('data-box-busy');
    }, 1200);
  }
}

function bindDrawer(root: HTMLElement) {
  if (root.hasAttribute('data-cart-ready')) {
    return;
  }
  root.setAttribute('data-cart-ready', 'true');

  root.querySelectorAll('[data-cart-close]').forEach((node) => {
    node.addEventListener('click', () => closeDrawer());
  });

  root.querySelector<HTMLAnchorElement>('[data-cart-checkout]')?.addEventListener('click', (event) => {
    if (readCart().length === 0) {
      event.preventDefault();
    }
  });

  const couponInput = root.querySelector<HTMLInputElement>('[data-cart-coupon-input]');
  const couponApply = root.querySelector<HTMLButtonElement>('[data-cart-coupon-apply]');
  const couponError = root.querySelector<HTMLElement>('[data-cart-coupon-error]');

  couponInput?.addEventListener('input', () => {
    if (couponApply) {
      couponApply.disabled = !couponInput.value.trim();
    }
    if (couponError) {
      couponError.hidden = true;
      couponError.textContent = '';
    }
  });

  couponApply?.addEventListener('click', () => {
    if (!couponInput?.value.trim() || !couponError) {
      return;
    }
    couponError.hidden = false;
    couponError.textContent = "That code isn't valid for this order.";
  });

  root.querySelectorAll<HTMLButtonElement>('[data-cart-add-box]').forEach((button) => {
    button.addEventListener('click', () => {
      void addBoxFromDrawer(root, button);
    });
  });
}

function bindHeaderTriggers() {
  document.querySelectorAll<HTMLElement>('[data-cart-open]').forEach((trigger) => {
    if (trigger.hasAttribute('data-cart-open-bound')) {
      return;
    }
    trigger.setAttribute('data-cart-open-bound', 'true');
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      openDrawer();
    });
  });
}

function syncAll() {
  const items = readCart();
  syncHeaderBadge(items);
  const root = drawerRoot();
  if (root) {
    renderDrawer(root, items);
  }
}

function initCartUi() {
  boxOfferFromPage();
  const root = drawerRoot();
  if (root) {
    bindDrawer(root);
  }
  bindHeaderTriggers();
  syncAll();

  if (!escapeBound) {
    escapeBound = true;
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeDrawer();
      }
    });
    window.addEventListener('iwc:cart-updated', () => syncAll());
    window.addEventListener('iwc:cart-open', () => openDrawer());
    window.addEventListener('storage', (event) => {
      if (event.key === CART_STORAGE_KEY) {
        syncAll();
      }
    });
  }
}

initCartUi();
document.addEventListener('astro:page-load', initCartUi);

export { openCartDrawer, openDrawer, closeDrawer };
