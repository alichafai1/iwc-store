export const prerender = false;

import type { APIRoute } from 'astro';
import { isSameOriginRequest } from '../../../lib/admin-auth';
import { createEmptyAddress, type CheckoutFormValues } from '../../../lib/checkout/validate';
import { defaultCountryCode } from '../../../data/countries';
import { buildPlacedOrder, isOfflinePaymentMethod, type PlaceOrderItemInput } from '../../../lib/orders';
import { createOrdersWriteClient, savePlacedOrder } from '../../../lib/orders-db';
import { sendOrderNotificationEmail } from '../../../lib/resend';

export const POST: APIRoute = async (context) => {
  if (!isSameOriginRequest(context.request)) {
    return json({ ok: false, error: 'This request could not be verified.' }, 403);
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return json({ ok: false, error: 'Send a JSON order payload.' }, 400);
  }

  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const customer = parseCustomer(record.customer);
  const items = parseItems(record.items);

  if (!customer) {
    return json({ ok: false, error: 'Customer checkout details are required.' }, 400);
  }

  if (!isOfflinePaymentMethod(customer.paymentOptionId)) {
    return json(
      {
        ok: false,
        error: 'Card payment is not available yet. Choose Bank Transfer, Revolut / Wise, or Crypto.',
      },
      400,
    );
  }

  const placed = buildPlacedOrder(customer, items);
  if ('error' in placed) {
    return json(
      {
        ok: false,
        error: placed.error,
        fieldErrors: 'fieldErrors' in placed ? placed.fieldErrors : undefined,
      },
      400,
    );
  }

  const supabase = createOrdersWriteClient();
  const saved = await savePlacedOrder(supabase, placed);
  if (!saved.ok) {
    console.error('[orders] save failed', saved.error);
    return json({ ok: false, error: 'Could not save your order. Please try again.' }, 500);
  }

  const emailed = await sendOrderNotificationEmail(placed);
  if (!emailed.ok) {
    console.error('[orders] notification email failed', emailed.error, placed.orderNumber);
  }

  return json({
    ok: true,
    orderNumber: placed.orderNumber,
    paymentStatus: placed.paymentStatus,
    emailSent: emailed.ok,
  });
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function parseAddress(value: unknown) {
  const record = asRecord(value);
  if (!record) {
    return createEmptyAddress(defaultCountryCode);
  }

  return {
    country: asString(record.country) || defaultCountryCode,
    firstName: asString(record.firstName),
    lastName: asString(record.lastName),
    address: asString(record.address),
    apartment: asString(record.apartment),
    city: asString(record.city),
    state: asString(record.state),
    postalCode: asString(record.postalCode),
  };
}

function parseCustomer(value: unknown): CheckoutFormValues | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const shipping = parseAddress(record);
  return {
    ...shipping,
    billing: parseAddress(record.billing),
    billingSameAsShipping: record.billingSameAsShipping !== false,
    email: asString(record.email),
    emailOffers: record.emailOffers === true,
    paymentOptionId: asString(record.paymentOptionId),
    phone: asString(record.phone),
    shippingOptionId: asString(record.shippingOptionId) || 'free',
  };
}

function parseItems(value: unknown): PlaceOrderItemInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const record = asRecord(entry);
    if (!record) {
      return [];
    }

    const price = typeof record.price === 'number' ? record.price : Number(record.price);
    const quantity = typeof record.quantity === 'number' ? record.quantity : Number(record.quantity);

    return [
      {
        slug: asString(record.slug),
        title: asString(record.title),
        quality: asString(record.quality),
        price,
        quantity,
        image: asString(record.image) || undefined,
      },
    ];
  });
}
