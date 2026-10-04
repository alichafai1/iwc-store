export const prerender = false;

import type { APIRoute } from 'astro';
import { fetchReceivedEmail, isSafeEmailAddress, sendInboundNotificationEmail, verifyResendWebhook } from '../../../lib/resend';

const MAX_BODY_BYTES = 262_144;
const forwardedIds = new Set<string>();

type InboundEvent = {
  type?: string;
  data?: {
    email_id?: string;
    created_at?: string;
    from?: string;
    to?: string[];
    subject?: string;
    attachments?: Array<{ filename?: string }>;
  };
};

export const POST: APIRoute = async ({ request }) => {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return new Response('Payload too large', { status: 413 });
  }

  const verified = verifyResendWebhook(raw, request.headers);
  if (!verified.ok) {
    console.error('[inbound] webhook rejected');
    return new Response('Unauthorized', { status: 401 });
  }

  let event: InboundEvent;
  try {
    event = JSON.parse(raw) as InboundEvent;
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  if (event.type !== 'email.received') {
    return new Response('Ignored', { status: 200 });
  }

  const emailId = event.data?.email_id ?? '';
  const senderEmail = extractEmail(event.data?.from ?? '');
  if (!/^[A-Za-z0-9_-]+$/.test(emailId) || !senderEmail) {
    return new Response('Bad request', { status: 400 });
  }

  if (forwardedIds.has(emailId)) {
    return new Response('Already forwarded', { status: 200 });
  }

  const received = await fetchReceivedEmail(emailId);
  if (!received) {
    console.error('[inbound] could not load received email', emailId);
    return new Response('Retry', { status: 502 });
  }

  const senderName = displayName(received.fromHeader, senderEmail);
  const recipient = (event.data?.to ?? []).join(', ') || 'contact@iwc-replica.to';
  const attachments = (event.data?.attachments ?? [])
    .map((attachment) => attachment.filename?.trim() ?? '')
    .filter(Boolean);
  const text = received.text.trim() || stripHtml(received.html);

  const forwarded = await sendInboundNotificationEmail({
    senderName,
    senderEmail,
    recipient,
    subject: event.data?.subject ?? '',
    text,
    receivedAt: event.data?.created_at ?? new Date().toISOString(),
    attachments,
  });

  if (!forwarded.ok) {
    console.error('[inbound] forward failed', emailId);
    return new Response('Retry', { status: 502 });
  }

  forwardedIds.add(emailId);
  if (forwardedIds.size > 500) {
    const oldest = forwardedIds.values().next().value;
    if (oldest) {
      forwardedIds.delete(oldest);
    }
  }

  return new Response('Forwarded', { status: 200 });
};

function extractEmail(value: string): string {
  const angled = value.match(/<([^<>\s]+)>/);
  const candidate = (angled?.[1] ?? value).trim();
  return isSafeEmailAddress(candidate) ? candidate : '';
}

function displayName(fromHeader: string | undefined, email: string): string {
  if (!fromHeader) {
    return '';
  }
  const name = fromHeader.replace(/<[^>]*>/g, '').replace(/["']/g, '').trim();
  return name.toLowerCase() === email.toLowerCase() ? '' : name.slice(0, 120);
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20_000);
}
