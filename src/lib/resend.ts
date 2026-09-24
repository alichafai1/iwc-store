import { formatMoney } from './cart';
import type { PlacedOrder } from './orders';

function envValue(name: string): string {
  const fromImport =
    typeof import.meta !== 'undefined' && import.meta.env
      ? String((import.meta.env as Record<string, unknown>)[name] ?? '').trim()
      : '';
  const fromProcess = typeof process !== 'undefined' ? (process.env[name] ?? '').trim() : '';
  return fromImport || fromProcess;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatAddress(order: PlacedOrder, kind: 'shipping' | 'billing'): string {
  const address = kind === 'shipping' ? order.shipping : order.billing;
  if (!address) {
    return 'Same as shipping';
  }

  return [
    `${address.firstName} ${address.lastName}`.trim(),
    address.address,
    address.apartment,
    [address.city, address.state, address.postalCode].filter(Boolean).join(', '),
    address.country,
  ]
    .filter((line) => Boolean(line && String(line).trim()))
    .join('\n');
}

export function buildOrderNotificationEmail(order: PlacedOrder): { subject: string; html: string; text: string } {
  const customerName = `${order.customerFirstName} ${order.customerLastName}`.trim();
  const productLines = order.items
    .map(
      (item) =>
        `${item.productTitle} (${item.quality}) × ${item.quantity} — ${formatMoney(item.lineTotal, order.currency)}`,
    )
    .join('\n');

  const text = [
    `New order ${order.orderNumber}`,
    '',
    `Customer: ${customerName}`,
    `Email: ${order.customerEmail}`,
    `Phone: ${order.customerPhone}`,
    '',
    'Products:',
    productLines,
    '',
    `Subtotal: ${formatMoney(order.subtotal, order.currency)}`,
    order.discountAmount > 0
      ? `Discount (${order.discountLabel}): -${formatMoney(order.discountAmount, order.currency)}`
      : null,
    `Shipping (${order.shippingLabel}): ${order.shippingCost === 0 ? 'Free' : formatMoney(order.shippingCost, order.currency)}`,
    `Total: ${formatMoney(order.total, order.currency)}`,
    '',
    `Payment method: ${order.paymentMethodLabel}`,
    `Payment status: ${order.paymentStatus}`,
    '',
    'Shipping:',
    formatAddress(order, 'shipping'),
    '',
    'Billing:',
    formatAddress(order, 'billing'),
  ]
    .filter((line) => line !== null)
    .join('\n');

  const itemRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">
          <strong>${escapeHtml(item.productTitle)}</strong><br />
          <span style="color:#666;">${escapeHtml(item.quality)}</span>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(formatMoney(item.lineTotal, order.currency))}</td>
      </tr>`,
    )
    .join('');

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#111;">
      <h1 style="font-size:20px;margin:0 0 16px;">New order ${escapeHtml(order.orderNumber)}</h1>
      <p><strong>Customer:</strong> ${escapeHtml(customerName)}<br />
      <strong>Email:</strong> ${escapeHtml(order.customerEmail)}<br />
      <strong>Phone:</strong> ${escapeHtml(order.customerPhone)}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px 0;border-bottom:2px solid #111;">Product</th>
            <th style="text-align:center;padding:8px 0;border-bottom:2px solid #111;">Qty</th>
            <th style="text-align:right;padding:8px 0;border-bottom:2px solid #111;">Line total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <p>
        <strong>Subtotal:</strong> ${escapeHtml(formatMoney(order.subtotal, order.currency))}<br />
        ${
          order.discountAmount > 0
            ? `<strong>Discount (${escapeHtml(order.discountLabel)}):</strong> -${escapeHtml(formatMoney(order.discountAmount, order.currency))}<br />`
            : ''
        }
        <strong>Shipping (${escapeHtml(order.shippingLabel)}):</strong> ${
          order.shippingCost === 0 ? 'Free' : escapeHtml(formatMoney(order.shippingCost, order.currency))
        }<br />
        <strong>Total:</strong> ${escapeHtml(formatMoney(order.total, order.currency))}
      </p>
      <p>
        <strong>Payment method:</strong> ${escapeHtml(order.paymentMethodLabel)}<br />
        <strong>Payment status:</strong> ${escapeHtml(order.paymentStatus)}
      </p>
      <p><strong>Shipping</strong><br />${escapeHtml(formatAddress(order, 'shipping')).replaceAll('\n', '<br />')}</p>
      <p><strong>Billing</strong><br />${escapeHtml(formatAddress(order, 'billing')).replaceAll('\n', '<br />')}</p>
    </div>
  `;

  return {
    subject: `New order ${order.orderNumber} — ${formatMoney(order.total, order.currency)} (${order.paymentMethodLabel})`,
    html,
    text,
  };
}

export async function sendOrderNotificationEmail(order: PlacedOrder): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = envValue('RESEND_API_KEY');
  const to = envValue('ORDER_NOTIFY_TO') || 'contact@iwc-replica.to';
  const from = envValue('ORDER_NOTIFY_FROM') || 'Orders <orders@iwc-replica.to>';

  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY is not configured.' };
  }

  const message = buildOrderNotificationEmail(order);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return { ok: false, error: `Resend error (${response.status}): ${body.slice(0, 300)}` };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Could not reach Resend.',
    };
  }
}
