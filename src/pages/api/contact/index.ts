export const prerender = false;

import type { APIRoute } from 'astro';
import { isSameOriginRequest } from '../../../lib/admin-auth';
import { isSafeEmailAddress, sendContactNotificationEmail } from '../../../lib/resend';

const MAX_BODY_BYTES = 16_384;
const MAX_NAME = 120;
const MAX_SUBJECT = 160;
const MAX_MESSAGE = 5_000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 5;

const recentSubmissions = new Map<string, number[]>();

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!isSameOriginRequest(request)) {
    return json({ ok: false, error: 'This request could not be verified. Please refresh the page and try again.' }, 403);
  }

  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return json({ ok: false, error: 'Unsupported request.' }, 415);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json({ ok: false, error: 'This message is too long.' }, 413);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('invalid');
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: 'Please check the form and try again.' }, 400);
  }

  if (typeof body.company === 'string' && body.company.trim()) {
    return json({ ok: true });
  }

  const name = cleanField(body.name, MAX_NAME).replace(/[\r\n]+/g, ' ');
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const subject = cleanField(body.subject, MAX_SUBJECT).replace(/[\r\n]+/g, ' ');
  const message = cleanField(body.message, MAX_MESSAGE);
  const phone = cleanField(body.phone, 40);
  const order = cleanField(body.order, 80);

  if (!name || !subject || !message || !isSafeEmailAddress(email)) {
    return json({ ok: false, error: 'Please enter your name, a valid email, a topic, and a message.' }, 400);
  }

  if (isRateLimited(clientAddress || 'unknown')) {
    return json({ ok: false, error: 'Please wait a few minutes before sending another message.' }, 429);
  }

  const details = [
    message,
    phone ? `\nPhone: ${phone}` : '',
    order ? `\nOrder: ${order}` : '',
  ].join('');

  const emailed = await sendContactNotificationEmail({ name, email, subject, message: details });
  if (!emailed.ok) {
    console.error('[contact] notification email failed');
    return json({ ok: false, error: 'We could not send your message. Please try again in a moment.' }, 503);
  }

  return json({ ok: true });
};

function cleanField(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, maxLength);
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const stamps = (recentSubmissions.get(key) ?? []).filter((stamp) => now - stamp < RATE_WINDOW_MS);
  if (stamps.length >= RATE_LIMIT) {
    recentSubmissions.set(key, stamps);
    return true;
  }
  stamps.push(now);
  recentSubmissions.set(key, stamps);
  if (recentSubmissions.size > 1_000) {
    const oldest = recentSubmissions.keys().next().value;
    if (oldest) {
      recentSubmissions.delete(oldest);
    }
  }
  return false;
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
