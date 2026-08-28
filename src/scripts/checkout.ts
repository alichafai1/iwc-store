import {
  MAX_ITEM_QUANTITY,
  cartCompareAtTotal,
  cartLineId,
  cartSubtotal,
  formatMoney,
  readCart,
  removeCartLine,
  updateCartQuantity,
  type CartLine,
} from '../lib/cart';
import { checkoutShippingOptions } from '../data/checkout';
import { defaultCountryCode } from '../data/countries';
import { validateCheckoutForm, type CheckoutAddress, type CheckoutFormValues } from '../lib/checkout/validate';

const FIELD_ERROR_IDS: Record<string, string> = {
  email: 'checkout-email-error',
  phone: 'shipping-phone-error',
  country: 'shipping-country-error',
  firstName: 'shipping-firstName-error',
  lastName: 'shipping-lastName-error',
  address: 'shipping-address-error',
  city: 'shipping-city-error',
  postalCode: 'shipping-postalCode-error',
  'billing.country': 'billing-country-error',
  'billing.firstName': 'billing-firstName-error',
  'billing.lastName': 'billing-lastName-error',
  'billing.address': 'billing-address-error',
  'billing.city': 'billing-city-error',
  'billing.postalCode': 'billing-postalCode-error',
};

function shippingCostFromForm(form: HTMLFormElement) {
  const selected = form.querySelector<HTMLInputElement>('input[name="shippingOptionId"]:checked');
  const option = checkoutShippingOptions.find((item) => item.id === selected?.value);
  return option?.price ?? 0;
}

function readAddress(form: FormData, prefix: '' | 'billing.'): CheckoutAddress {
  const value = (name: string) => String(form.get(`${prefix}${name}`) ?? '');
  return {
    country: value('country') || defaultCountryCode,
    firstName: value('firstName'),
    lastName: value('lastName'),
    address: value('address'),
    apartment: value('apartment'),
    city: value('city'),
    state: value('state'),
    postalCode: value('postalCode'),
  };
}

function readFormValues(form: HTMLFormElement): CheckoutFormValues {
  const data = new FormData(form);
  const shipping = readAddress(data, '');
  return {
    ...shipping,
    billing: readAddress(data, 'billing.'),
    billingSameAsShipping: String(data.get('billingSameAsShipping') ?? 'same') === 'same',
    email: String(data.get('email') ?? ''),
    emailOffers: data.get('emailOffers') === 'on',
    paymentOptionId: String(data.get('paymentOptionId') ?? ''),
    phone: String(data.get('phone') ?? ''),
    shippingOptionId: String(data.get('shippingOptionId') ?? ''),
  };
}

function clearErrors(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('.checkout__error').forEach((node) => {
    node.hidden = true;
    node.textContent = '';
  });
  root.querySelectorAll('.checkout__control.is-invalid').forEach((node) => {
    node.classList.remove('is-invalid');
    node.removeAttribute('aria-invalid');
    node.removeAttribute('aria-describedby');
  });
}

function showErrors(root: HTMLElement, errors: Record<string, string>) {
  clearErrors(root);
  Object.entries(errors).forEach(([key, message]) => {
    const errorId = FIELD_ERROR_IDS[key];
    const errorNode = errorId ? root.querySelector<HTMLElement>(`#${errorId}`) : null;
    const inputId = errorId?.replace(/-error$/, '');
    const input = inputId ? root.querySelector<HTMLElement>(`#${inputId}`) : null;
    if (errorNode) {
      errorNode.hidden = false;
      errorNode.textContent = message;
    }
    if (input) {
      input.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');
      if (errorId) {
        input.setAttribute('aria-describedby', errorId);
      }
    }
  });
}

function renderItems(root: HTMLElement, items: CartLine[]) {
  const list = root.querySelector('[data-checkout-items]');
  const template = root.querySelector<HTMLTemplateElement>('[data-checkout-item-template]');
  if (!list || !template) {
    return;
  }

  list.replaceChildren();

  items.forEach((item) => {
    const node = template.content.firstElementChild?.cloneNode(true);
    if (!(node instanceof HTMLElement)) {
      return;
    }

    const id = cartLineId(item);
    const thumb = node.querySelector('img');
    const badge = node.querySelector('.checkout__qty-badge');
    const title = node.querySelector<HTMLAnchorElement>('.checkout__item-title');
    const quality = node.querySelector('.checkout__item-quality');
    const qty = node.querySelector('[data-item-qty]');
    const line = node.querySelector('[data-item-line]');
    const compare = node.querySelector<HTMLElement>('[data-item-compare]');
    const decrease = node.querySelector<HTMLButtonElement>('[data-qty-delta="-1"]');
    const increase = node.querySelector<HTMLButtonElement>('[data-qty-delta="1"]');
    const remove = node.querySelector<HTMLButtonElement>('.checkout__remove');

    if (thumb) {
      if (item.image) {
        thumb.src = item.image;
        thumb.alt = item.imageAlt || item.title;
      } else {
        thumb.remove();
      }
    }

    if (badge) {
      badge.textContent = String(item.quantity);
    }
    if (title) {
      title.href = `/products/${item.slug}/`;
      title.textContent = item.title;
    }
    if (quality) {
      quality.textContent = item.quality;
    }
    if (qty) {
      qty.textContent = String(item.quantity);
    }
    if (line) {
      line.textContent = formatMoney(item.price * item.quantity);
    }
    if (compare) {
      if (item.compareAtPrice && item.compareAtPrice > item.price) {
        compare.hidden = false;
        compare.textContent = formatMoney(item.compareAtPrice * item.quantity);
      } else {
        compare.hidden = true;
      }
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

function syncTotals(root: HTMLElement, items: CartLine[], shippingCost: number) {
  const subtotal = cartSubtotal(items);
  const total = Math.round((subtotal + shippingCost) * 100) / 100;
  const savings = Math.round((cartCompareAtTotal(items) - subtotal) * 100) / 100;

  root.querySelectorAll('[data-checkout-subtotal]').forEach((node) => {
    node.textContent = formatMoney(subtotal);
  });
  root.querySelectorAll('[data-checkout-total]').forEach((node) => {
    node.textContent = formatMoney(total);
  });

  const shipping = root.querySelector('[data-checkout-shipping]');
  if (shipping) {
    shipping.textContent = shippingCost === 0 ? 'Free' : formatMoney(shippingCost);
  }

  const savingsNode = root.querySelector<HTMLElement>('[data-checkout-savings]');
  if (savingsNode) {
    if (savings > 0) {
      savingsNode.hidden = false;
      savingsNode.textContent = `You save ${formatMoney(savings)} on this order`;
    } else {
      savingsNode.hidden = true;
    }
  }
}

function setChoiceChecked(label: Element | null, checked: boolean) {
  if (!(label instanceof HTMLElement)) {
    return;
  }
  label.classList.toggle('is-checked', checked);
}

function bindCheckout(root: HTMLElement) {
  const loading = root.querySelector<HTMLElement>('[data-checkout-loading]');
  const empty = root.querySelector<HTMLElement>('[data-checkout-empty]');
  const main = root.querySelector<HTMLElement>('[data-checkout-main]');
  const form = root.querySelector<HTMLFormElement>('[data-checkout-form]');
  const summary = root.querySelector<HTMLElement>('[data-checkout-summary]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-summary-toggle]');
  const toggleLabel = root.querySelector('[data-summary-toggle-label]');
  const notice = root.querySelector<HTMLElement>('[data-checkout-notice]');
  const billingExtra = root.querySelector<HTMLElement>('[data-billing-extra]');
  const discountInput = root.querySelector<HTMLInputElement>('[data-discount-input]');
  const discountApply = root.querySelector<HTMLButtonElement>('[data-discount-apply]');
  const discountError = root.querySelector<HTMLElement>('[data-discount-error]');

  function render() {
    const items = readCart();
    const shippingCost = form ? shippingCostFromForm(form) : 0;

    loading?.setAttribute('hidden', '');
    if (items.length === 0) {
      empty?.removeAttribute('hidden');
      main?.setAttribute('hidden', '');
      return;
    }

    empty?.setAttribute('hidden', '');
    main?.removeAttribute('hidden');
    renderItems(root, items);
    syncTotals(root, items, shippingCost);
  }

  toggle?.addEventListener('click', () => {
    const open = !summary?.classList.contains('is-open');
    summary?.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (toggleLabel) {
      toggleLabel.textContent = open ? 'Hide order summary' : 'Show order summary';
    }
  });

  form?.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((input) => {
    input.addEventListener('change', () => {
      form.querySelectorAll(`input[name="${input.name}"]`).forEach((radio) => {
        setChoiceChecked(radio.closest('.checkout__choice'), radio instanceof HTMLInputElement && radio.checked);
      });

      if (input.name === 'billingSameAsShipping' && billingExtra) {
        billingExtra.hidden = input.value !== 'different';
      }

      if (input.name === 'shippingOptionId') {
        render();
      }
    });
  });

  discountInput?.addEventListener('input', () => {
    if (discountApply) {
      discountApply.disabled = !discountInput.value.trim();
    }
    if (discountError) {
      discountError.hidden = true;
      discountError.textContent = '';
    }
  });

  discountApply?.addEventListener('click', () => {
    if (!discountInput?.value.trim() || !discountError) {
      return;
    }
    discountError.hidden = false;
    discountError.textContent = "That code isn't valid for this order.";
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form) {
      return;
    }

    const values = readFormValues(form);
    const errors = validateCheckoutForm(values);
    showErrors(root, errors);

    if (Object.keys(errors).length > 0) {
      if (notice) {
        notice.hidden = true;
      }
      const firstInvalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
      firstInvalid?.focus();
      firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (notice) {
      notice.hidden = false;
    }
  });

  window.addEventListener('iwc:cart-updated', render);
  window.addEventListener('storage', (event) => {
    if (event.key === 'iwc-store-cart') {
      render();
    }
  });

  render();
}

function initCheckout() {
  document.querySelectorAll<HTMLElement>('[data-checkout]').forEach((root) => {
    if (!root.hasAttribute('data-checkout-ready')) {
      root.setAttribute('data-checkout-ready', '');
      bindCheckout(root);
    }
  });
}

initCheckout();
document.addEventListener('astro:page-load', initCheckout);
