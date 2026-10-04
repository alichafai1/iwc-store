import { createHmac, timingSafeEqual } from 'node:crypto';
import { formatMoney } from './cart';
import { formatPhoneForDisplay } from './checkout/phone';
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
    `Phone: ${formatPhoneForDisplay(order.customerPhone)}`,
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
      <strong>Phone:</strong> ${escapeHtml(formatPhoneForDisplay(order.customerPhone))}</p>
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

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const RESEND_RECEIVING_ENDPOINT = 'https://api.resend.com/emails/receiving';
const RESEND_TIMEOUT_MS = 10_000;
const WEBHOOK_TOLERANCE_SECONDS = 300;
const DEFAULT_RECEIVING_EMAIL = 'kanzachafai123@gmail.com';
const ORDER_FROM = 'Orders <orders@iwc-replica.to>';
const CONTACT_FROM = 'IWC Replica <contact@iwc-replica.to>';

export type EmailResult = { ok: true } | { ok: false; error: string };

type OutboundEmail = {
  from: string;
  to: string[];
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
};

export function isSafeEmailAddress(value: string): boolean {
  const email = value.trim();
  if (email.length < 3 || email.length > 254 || /[\r\n]/.test(email)) {
    return false;
  }
  return /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(email);
}

/** Gmail inbox that receives IWC contact, order, and forwarded mail. */
export function receivingEmail(): string {
  const configured = envValue('IWC_RECEIVING_EMAIL') || DEFAULT_RECEIVING_EMAIL;
  const address = configured.split(',')[0]?.trim() || DEFAULT_RECEIVING_EMAIL;
  return isSafeEmailAddress(address) ? address : DEFAULT_RECEIVING_EMAIL;
}

function headerSafe(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export async function sendResendEmail(message: OutboundEmail): Promise<EmailResult> {
  const apiKey = envValue('RESEND_API_KEY');
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY is not configured.' };
  }

  const replyTo = message.replyTo && isSafeEmailAddress(message.replyTo) ? message.replyTo.trim() : undefined;

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: message.from,
        to: message.to,
        reply_to: replyTo,
        subject: headerSafe(message.subject).slice(0, 200),
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });

    if (!response.ok) {
      return { ok: false, error: `Resend responded ${response.status}.` };
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      return { ok: false, error: `Resend did not respond within ${RESEND_TIMEOUT_MS / 1000}s.` };
    }
    return { ok: false, error: 'Could not reach Resend.' };
  }
}

export async function sendOrderNotificationEmail(order: PlacedOrder): Promise<EmailResult> {
  const message = buildOrderNotificationEmail(order);
  return sendResendEmail({
    from: envValue('ORDER_NOTIFY_FROM') || ORDER_FROM,
    to: [receivingEmail()],
    replyTo: order.customerEmail,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
}

export type ContactMessage = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export function buildContactNotificationEmail(input: ContactMessage): { subject: string; html: string; text: string } {
  const text = [
    'New contact form message',
    '',
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Subject: ${input.subject}`,
    '',
    input.message,
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#111;">
      <h1 style="font-size:20px;margin:0 0 16px;">New contact form message</h1>
      <p><strong>Name:</strong> ${escapeHtml(input.name)}<br />
      <strong>Email:</strong> ${escapeHtml(input.email)}<br />
      <strong>Subject:</strong> ${escapeHtml(input.subject)}</p>
      <p style="white-space:pre-wrap;">${escapeHtml(input.message)}</p>
    </div>`;

  return {
    subject: `New contact message — ${headerSafe(input.subject)}`.slice(0, 200),
    html,
    text,
  };
}

export async function sendContactNotificationEmail(input: ContactMessage): Promise<EmailResult> {
  const message = buildContactNotificationEmail(input);
  return sendResendEmail({
    from: CONTACT_FROM,
    to: [receivingEmail()],
    replyTo: input.email,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
}

export type InboundNotice = {
  senderName: string;
  senderEmail: string;
  recipient: string;
  subject: string;
  text: string;
  receivedAt: string;
  attachments: string[];
};

export function buildInboundNotificationEmail(input: InboundNotice): { subject: string; html: string; text: string } {
  const originalSubject = headerSafe(input.subject) || '(no subject)';
  const attachmentLines = input.attachments.length > 0 ? input.attachments : ['None'];
  const plainBody = input.text.trim() || '(no plain-text body)';
  const fromLine = input.senderName ? `${input.senderName} <${input.senderEmail}>` : input.senderEmail;
  const text = [
    'New email to contact@iwc-replica.to',
    '',
    `From: ${fromLine}`,
    `To: ${input.recipient}`,
    `Subject: ${originalSubject}`,
    `Received: ${input.receivedAt}`,
    `Attachments: ${attachmentLines.join(', ')}`,
    '',
    plainBody,
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#111;">
      <h1 style="font-size:20px;margin:0 0 16px;">New email to contact@iwc-replica.to</h1>
      <p><strong>From:</strong> ${escapeHtml(fromLine)}<br />
      <strong>To:</strong> ${escapeHtml(input.recipient)}<br />
      <strong>Subject:</strong> ${escapeHtml(originalSubject)}<br />
      <strong>Received:</strong> ${escapeHtml(input.receivedAt)}<br />
      <strong>Attachments:</strong> ${escapeHtml(attachmentLines.join(', '))}</p>
      <p style="white-space:pre-wrap;">${escapeHtml(plainBody)}</p>
    </div>`;

  return {
    subject: `New email to contact@iwc-replica.to: ${originalSubject}`.slice(0, 200),
    html,
    text,
  };
}

export async function sendInboundNotificationEmail(input: InboundNotice): Promise<EmailResult> {
  const message = buildInboundNotificationEmail(input);
  return sendResendEmail({
    from: CONTACT_FROM,
    to: [receivingEmail()],
    replyTo: input.senderEmail,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
}

type ReceivedEmail = {
  text: string;
  html: string;
  fromHeader: string;
};

export async function fetchReceivedEmail(emailId: string): Promise<ReceivedEmail | null> {
  const apiKey = envValue('RESEND_API_KEY');
  if (!apiKey || !/^[A-Za-z0-9_-]+$/.test(emailId)) {
    return null;
  }

  try {
    const response = await fetch(`${RESEND_RECEIVING_ENDPOINT}/${emailId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { data?: Record<string, unknown> } & Record<string, unknown>;
    const email = (payload.data ?? payload) as Record<string, unknown>;
    return {
      text: typeof email.text === 'string' ? email.text : '',
      html: typeof email.html === 'string' ? email.html : '',
      fromHeader: headerValue(email.headers, 'from'),
    };
  } catch {
    return null;
  }
}

function headerValue(headers: unknown, name: string): string {
  if (Array.isArray(headers)) {
    const match = headers.find((entry) => {
      if (!entry || typeof entry !== 'object') {
        return false;
      }
      const record = entry as { name?: string };
      return record.name?.toLowerCase() === name;
    }) as { value?: string } | undefined;
    return match?.value ?? '';
  }

  if (headers && typeof headers === 'object') {
    const record = headers as Record<string, unknown>;
    const value = record[name] ?? record[name.toLowerCase()];
    return typeof value === 'string' ? value : '';
  }

  return '';
}

function decodeWebhookSecret(secret: string): Buffer | null {
  const encoded = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret;
  try {
    const bytes = Buffer.from(encoded, 'base64');
    return bytes.length > 0 ? bytes : null;
  } catch {
    return null;
  }
}

/** Svix signature used by Resend webhooks. Rejects missing or stale signatures. */
export function verifyResendWebhook(rawBody: string, headers: Headers): EmailResult {
  const secret = envValue('IWC_RESEND_WEBHOOK_SECRET');
  if (!secret) {
    return { ok: false, error: 'IWC_RESEND_WEBHOOK_SECRET is not configured.' };
  }

  const id = headers.get('svix-id') ?? '';
  const timestamp = headers.get('svix-timestamp') ?? '';
  const signature = headers.get('svix-signature') ?? '';
  const key = decodeWebhookSecret(secret);
  if (!id || !timestamp || !signature || !key || /[\r\n]/.test(id)) {
    return { ok: false, error: 'Missing webhook signature.' };
  }

  const unix = Number(timestamp);
  if (!Number.isFinite(unix) || Math.abs(Date.now() / 1000 - unix) > WEBHOOK_TOLERANCE_SECONDS) {
    return { ok: false, error: 'Webhook timestamp is outside the allowed window.' };
  }

  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest('base64');
  const expectedBytes = Buffer.from(expected);
  const candidates = signature.split(' ').map((part) => part.split(',')[1] ?? '').filter(Boolean);
  const match = candidates.some((candidate) => {
    const actual = Buffer.from(candidate);
    return actual.length === expectedBytes.length && timingSafeEqual(actual, expectedBytes);
  });

  return match ? { ok: true } : { ok: false, error: 'Webhook signature did not match.' };
}
