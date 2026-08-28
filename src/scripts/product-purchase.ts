import { formatMoney, persistCartLine, type CartLine } from '../lib/cart';
import { DEFAULT_QUALITY } from '../lib/qualities';

const ADD_SUCCESS_MS = 1250;
const ERROR_MS = 1400;
const ADD_MIN_PENDING_MS = 280;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function getSelection(root: Element): CartLine {
  const qualityInput =
    root.querySelector<HTMLInputElement>('input[name="product-quality"]:checked') ??
    root.querySelector<HTMLInputElement>('input[name="product-quality"]');
  const qtyInput = root.querySelector<HTMLInputElement>('[data-product-qty] input');
  const price = Number(qualityInput?.getAttribute('data-price'));
  const compareRaw = qualityInput?.getAttribute('data-compare-at');
  const compareAtPrice = compareRaw ? Number(compareRaw) : NaN;
  const quantity = Math.max(1, Math.floor(Number(qtyInput?.value) || 1));

  if (qtyInput) {
    qtyInput.value = String(quantity);
  }

  return {
    slug: root.getAttribute('data-product-slug') ?? '',
    title: root.getAttribute('data-product-title') ?? '',
    quality: qualityInput?.value || DEFAULT_QUALITY,
    price: Number.isFinite(price) ? price : 0,
    quantity,
    image: root.getAttribute('data-product-image') || undefined,
    imageAlt: root.getAttribute('data-product-image-alt') || undefined,
    compareAtPrice: Number.isFinite(compareAtPrice) ? compareAtPrice : undefined,
  };
}

function setQty(root: Element, next: number) {
  const input = root.querySelector<HTMLInputElement>('[data-product-qty] input');
  if (!input) {
    return;
  }

  input.value = String(Math.max(1, Math.floor(next)));
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function syncSticky(root: Element) {
  const selection = getSelection(root);

  root.querySelectorAll('[data-sticky-price]').forEach((node) => {
    node.textContent = formatMoney(selection.price);
  });

  const stickyQuality = root.querySelector('[data-sticky-quality]');
  if (stickyQuality) {
    stickyQuality.textContent = selection.quality;
  }

  root.querySelectorAll('[data-sticky-qty-value]').forEach((node) => {
    node.textContent = String(selection.quantity);
  });
}

function setStatus(root: Element, message: string) {
  const live = root.querySelector('[data-purchase-status]');
  if (live) {
    live.textContent = message;
  }
}

function setActionButtons(
  root: Element,
  action: 'add' | 'buy',
  state: 'idle' | 'pending' | 'success' | 'error',
) {
  root.querySelectorAll<HTMLButtonElement>(`[data-cart-action="${action}"]`).forEach((button) => {
    const idleLabel = button.getAttribute('data-idle-label') ?? button.textContent ?? '';
    if (!button.getAttribute('data-idle-label')) {
      button.setAttribute('data-idle-label', idleLabel);
    }

    button.setAttribute('data-action-state', state);

    if (state === 'pending') {
      button.textContent = action === 'add' ? 'Adding...' : 'Processing...';
    } else if (state === 'success') {
      button.textContent = 'Added to Cart ✓';
    } else if (state === 'error') {
      button.textContent = action === 'add' ? 'Couldn’t add' : 'Couldn’t continue';
    } else {
      button.textContent = button.getAttribute('data-idle-label') ?? idleLabel;
    }
  });
}

function setBusy(root: Element, busy: boolean) {
  root.querySelectorAll<HTMLButtonElement>('[data-cart-action]').forEach((button) => {
    button.disabled = busy;
    button.setAttribute('aria-busy', busy ? 'true' : 'false');
  });
  root.querySelectorAll<HTMLButtonElement>('[data-qty-step], [data-sticky-qty-step]').forEach((button) => {
    button.disabled = busy;
  });
  root.querySelectorAll<HTMLInputElement>('input[name="product-quality"]').forEach((input) => {
    input.disabled = busy;
  });
  const qtyInput = root.querySelector<HTMLInputElement>('[data-product-qty] input');
  if (qtyInput) {
    qtyInput.disabled = busy;
  }
}

async function runCartAction(root: Element, action: 'add' | 'buy') {
  if (root.getAttribute('data-purchase-busy') === 'true') {
    return;
  }

  root.setAttribute('data-purchase-busy', 'true');
  setBusy(root, true);
  setActionButtons(root, action, 'pending');
  setStatus(root, action === 'add' ? 'Adding to cart' : 'Processing checkout');
  await waitForPaint();

  const started = Date.now();

  try {
    persistCartLine(getSelection(root));

    if (action === 'buy') {
      window.location.assign('/checkout/');
      return;
    }

    const elapsed = Date.now() - started;
    if (elapsed < ADD_MIN_PENDING_MS && !prefersReducedMotion()) {
      await wait(ADD_MIN_PENDING_MS - elapsed);
    }

    setActionButtons(root, 'add', 'success');
    setStatus(root, 'Added to cart');
    await wait(prefersReducedMotion() ? 400 : ADD_SUCCESS_MS);
  } catch {
    setActionButtons(root, action, 'error');
    setStatus(
      root,
      action === 'add' ? 'Could not add to cart. Please try again.' : 'Could not continue to checkout. Please try again.',
    );
    await wait(prefersReducedMotion() ? 500 : ERROR_MS);
  } finally {
    if (action === 'buy' && !root.querySelector('[data-cart-action="buy"][data-action-state="error"]')) {
      return;
    }

    setActionButtons(root, action, 'idle');
    setBusy(root, false);
    root.removeAttribute('data-purchase-busy');
    window.setTimeout(() => setStatus(root, ''), 250);
  }
}

function bindStickyVisibility(root: Element) {
  const anchor = root.querySelector('[data-purchase-anchor]');
  const sticky = root.querySelector<HTMLElement>('[data-purchase-sticky]');
  if (!anchor || !sticky) {
    return;
  }

  const updatePadding = () => {
    const visible = sticky.classList.contains('is-visible');
    document.body.style.setProperty('--purchase-sticky-offset', visible ? `${sticky.offsetHeight}px` : '0px');
  };

  const setVisible = (show: boolean) => {
    sticky.classList.toggle('is-visible', show);
    sticky.setAttribute('aria-hidden', show ? 'false' : 'true');
    if (show) {
      sticky.removeAttribute('inert');
    } else {
      sticky.setAttribute('inert', '');
    }
    updatePadding();
  };

  let ticking = false;
  const update = () => {
    ticking = false;
    setVisible(anchor.getBoundingClientRect().bottom <= 0);
  };

  const onScrollOrResize = () => {
    if (ticking) {
      return;
    }
    ticking = true;
    requestAnimationFrame(update);
  };

  const observer = new IntersectionObserver(update, { threshold: 0 });
  observer.observe(anchor);
  window.addEventListener('scroll', onScrollOrResize, { passive: true });
  window.addEventListener('resize', onScrollOrResize);
  update();
}

function bindPurchase(root: Element) {
  const qtyRoot = root.querySelector('[data-product-qty]');
  const qtyInput = qtyRoot?.querySelector<HTMLInputElement>('input');

  qtyRoot?.querySelectorAll('[data-qty-step]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!qtyInput) {
        return;
      }
      setQty(root, Number(qtyInput.value || 1) + Number(button.getAttribute('data-qty-step')));
    });
  });

  qtyInput?.addEventListener('input', () => syncSticky(root));
  qtyInput?.addEventListener('change', () => {
    setQty(root, Number(qtyInput.value || 1));
    syncSticky(root);
  });

  root.querySelectorAll('[data-sticky-qty-step]').forEach((button) => {
    button.addEventListener('click', () => {
      const currentQty = Number(qtyInput?.value || 1);
      setQty(root, currentQty + Number(button.getAttribute('data-sticky-qty-step')));
    });
  });

  root.querySelectorAll<HTMLButtonElement>('[data-cart-action]').forEach((button) => {
    if (!button.getAttribute('data-idle-label')) {
      button.setAttribute('data-idle-label', button.textContent?.trim() ?? '');
    }

    button.addEventListener('click', () => {
      const action = button.getAttribute('data-cart-action');
      if (action === 'add' || action === 'buy') {
        void runCartAction(root, action);
      }
    });
  });

  syncSticky(root);
  bindStickyVisibility(root);
}

function initProductPurchase() {
  document.querySelectorAll('[data-product-purchase]').forEach((root) => {
    if (root instanceof HTMLElement && !root.hasAttribute('data-purchase-ready')) {
      root.setAttribute('data-purchase-ready', 'true');
      bindPurchase(root);
    }
  });
}

initProductPurchase();
document.addEventListener('astro:page-load', initProductPurchase);
