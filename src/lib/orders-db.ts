import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import type { PlacedOrder } from './orders';
import { getSupabasePublicEnv } from './supabase-env';

function envValue(name: string): string {
  const fromImport =
    typeof import.meta !== 'undefined' && import.meta.env
      ? String((import.meta.env as Record<string, unknown>)[name] ?? '').trim()
      : '';
  const fromProcess = typeof process !== 'undefined' ? (process.env[name] ?? '').trim() : '';
  return fromImport || fromProcess;
}

/** Prefer the secret key when present; otherwise use the publishable key with INSERT RLS. */
export function createOrdersWriteClient(): SupabaseClient<Database> {
  const { url, publishableKey } = getSupabasePublicEnv();
  const secretKey = envValue('SUPABASE_SERVICE_ROLE_KEY') || envValue('SUPABASE_SECRET_KEY');
  return createClient<Database>(url, secretKey || publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function savePlacedOrder(
  supabase: SupabaseClient<Database>,
  order: PlacedOrder,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error: orderError } = await supabase.from('orders').insert({
    id: order.id,
    order_number: order.orderNumber,
    customer_email: order.customerEmail,
    customer_phone: order.customerPhone,
    customer_first_name: order.customerFirstName,
    customer_last_name: order.customerLastName,
    shipping_country: order.shipping.country,
    shipping_address: order.shipping.address,
    shipping_apartment: order.shipping.apartment || null,
    shipping_city: order.shipping.city,
    shipping_state: order.shipping.state || null,
    shipping_postal_code: order.shipping.postalCode,
    billing_same_as_shipping: order.billingSameAsShipping,
    billing_country: order.billing?.country ?? null,
    billing_first_name: order.billing?.firstName ?? null,
    billing_last_name: order.billing?.lastName ?? null,
    billing_address: order.billing?.address ?? null,
    billing_apartment: order.billing?.apartment ?? null,
    billing_city: order.billing?.city ?? null,
    billing_state: order.billing?.state ?? null,
    billing_postal_code: order.billing?.postalCode ?? null,
    shipping_option_id: order.shippingOptionId,
    shipping_label: order.shippingLabel,
    shipping_cost: order.shippingCost,
    payment_method: order.paymentMethod,
    payment_status: order.paymentStatus,
    subtotal: order.subtotal,
    discount_amount: order.discountAmount,
    discount_label: order.discountLabel || null,
    total: order.total,
    currency: order.currency,
    email_offers: order.emailOffers,
  });

  if (orderError) {
    return { ok: false, error: orderError.message };
  }

  const { error: itemsError } = await supabase.from('order_items').insert(
    order.items.map((item) => ({
      order_id: order.id,
      product_slug: item.productSlug,
      product_title: item.productTitle,
      quality: item.quality,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      line_total: item.lineTotal,
      image_url: item.imageUrl,
    })),
  );

  if (itemsError) {
    console.error('[orders] items insert failed after order insert', order.id, itemsError.message);
    return { ok: false, error: itemsError.message };
  }

  return { ok: true };
}
