import { checkoutPaymentOptions, checkoutShippingOptions } from '../data/checkout';
import type { CheckoutAddress, CheckoutFormValues } from './checkout/validate';
import { validateCheckoutForm } from './checkout/validate';
import { CHECKOUT_CURRENCY, clampQuantity, type CartLine } from './cart';

export const OFFLINE_PAYMENT_METHODS = ['bank-transfer', 'revolut-wise', 'crypto'] as const;

export type OfflinePaymentMethod = (typeof OFFLINE_PAYMENT_METHODS)[number];

export type PlaceOrderItemInput = {
  slug: string;
  title: string;
  quality: string;
  price: number;
  quantity: number;
  image?: string;
};

export type PlaceOrderRequest = {
  customer: CheckoutFormValues;
  items: PlaceOrderItemInput[];
};

export type PlacedOrderItem = {
  productSlug: string;
  productTitle: string;
  quality: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  imageUrl: string | null;
};

export type PlacedOrder = {
  id: string;
  orderNumber: string;
  customerEmail: string;
  customerPhone: string;
  customerFirstName: string;
  customerLastName: string;
  shipping: CheckoutAddress;
  billingSameAsShipping: boolean;
  billing: CheckoutAddress | null;
  shippingOptionId: string;
  shippingLabel: string;
  shippingCost: number;
  paymentMethod: OfflinePaymentMethod;
  paymentMethodLabel: string;
  paymentStatus: 'pending';
  subtotal: number;
  discountAmount: number;
  discountLabel: string;
  total: number;
  currency: string;
  emailOffers: boolean;
  items: PlacedOrderItem[];
};

export function isOfflinePaymentMethod(value: string): value is OfflinePaymentMethod {
  return (OFFLINE_PAYMENT_METHODS as readonly string[]).includes(value);
}

export function paymentMethodLabel(method: OfflinePaymentMethod): string {
  return checkoutPaymentOptions.find((option) => option.id === method)?.label ?? method;
}

export function createOrderNumber(): string {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const random = crypto.randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase();
  return `IWC-${stamp}-${random}`;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeItems(items: PlaceOrderItemInput[]): PlacedOrderItem[] | { error: string } {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'Your cart is empty.' };
  }

  if (items.length > 50) {
    return { error: 'This order has too many line items.' };
  }

  const normalized: PlacedOrderItem[] = [];

  for (const item of items) {
    if (
      typeof item?.slug !== 'string' ||
      !item.slug.trim() ||
      typeof item.title !== 'string' ||
      !item.title.trim() ||
      typeof item.quality !== 'string' ||
      !item.quality.trim() ||
      typeof item.price !== 'number' ||
      !Number.isFinite(item.price) ||
      item.price < 0 ||
      typeof item.quantity !== 'number'
    ) {
      return { error: 'One or more cart items are invalid.' };
    }

    const quantity = clampQuantity(item.quantity);
    const unitPrice = roundMoney(item.price);
    normalized.push({
      productSlug: item.slug.trim(),
      productTitle: item.title.trim(),
      quality: item.quality.trim(),
      unitPrice,
      quantity,
      lineTotal: roundMoney(unitPrice * quantity),
      imageUrl: typeof item.image === 'string' && item.image.trim() ? item.image.trim() : null,
    });
  }

  return normalized;
}

export function buildPlacedOrder(
  customer: CheckoutFormValues,
  rawItems: PlaceOrderItemInput[],
): PlacedOrder | { error: string; fieldErrors?: Record<string, string> } {
  const fieldErrors = validateCheckoutForm(customer);
  if (Object.keys(fieldErrors).length > 0) {
    return { error: 'Please fix the highlighted checkout fields.', fieldErrors };
  }

  if (!isOfflinePaymentMethod(customer.paymentOptionId)) {
    return { error: 'Choose Bank Transfer, Revolut / Wise, or Crypto to place this order.' };
  }

  const shippingOption =
    checkoutShippingOptions.find((option) => option.id === customer.shippingOptionId) ??
    checkoutShippingOptions[0];

  if (!shippingOption) {
    return { error: 'Choose a shipping option.' };
  }

  const items = normalizeItems(rawItems);
  if ('error' in items) {
    return items;
  }

  const paymentOption = checkoutPaymentOptions.find((option) => option.id === customer.paymentOptionId);
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const discountPercent = paymentOption?.discountPercent ?? 0;
  const discountAmount = discountPercent > 0 ? roundMoney(subtotal * (discountPercent / 100)) : 0;
  const discountLabel =
    discountAmount > 0
      ? `${(paymentOption?.label.split(' (')[0] ?? paymentOption?.label) ?? 'Payment'} ${discountPercent}% off`
      : '';
  const shippingCost = shippingOption.price;
  const total = roundMoney(subtotal - discountAmount + shippingCost);

  const shipping: CheckoutAddress = {
    country: customer.country.trim(),
    firstName: customer.firstName.trim(),
    lastName: customer.lastName.trim(),
    address: customer.address.trim(),
    apartment: customer.apartment.trim(),
    city: customer.city.trim(),
    state: customer.state.trim(),
    postalCode: customer.postalCode.trim(),
  };

  const billing = customer.billingSameAsShipping
    ? null
    : {
        country: customer.billing.country.trim(),
        firstName: customer.billing.firstName.trim(),
        lastName: customer.billing.lastName.trim(),
        address: customer.billing.address.trim(),
        apartment: customer.billing.apartment.trim(),
        city: customer.billing.city.trim(),
        state: customer.billing.state.trim(),
        postalCode: customer.billing.postalCode.trim(),
      };

  return {
    id: crypto.randomUUID(),
    orderNumber: createOrderNumber(),
    customerEmail: customer.email.trim(),
    customerPhone: customer.phone.trim(),
    customerFirstName: shipping.firstName,
    customerLastName: shipping.lastName,
    shipping,
    billingSameAsShipping: customer.billingSameAsShipping,
    billing,
    shippingOptionId: shippingOption.id,
    shippingLabel: shippingOption.label,
    shippingCost,
    paymentMethod: customer.paymentOptionId,
    paymentMethodLabel: paymentMethodLabel(customer.paymentOptionId),
    paymentStatus: 'pending',
    subtotal,
    discountAmount,
    discountLabel,
    total,
    currency: CHECKOUT_CURRENCY,
    emailOffers: customer.emailOffers,
    items,
  };
}

export function cartLinesToOrderItems(items: CartLine[]): PlaceOrderItemInput[] {
  return items.map((item) => ({
    slug: item.slug,
    title: item.title,
    quality: item.quality,
    price: item.price,
    quantity: item.quantity,
    image: item.image,
  }));
}
