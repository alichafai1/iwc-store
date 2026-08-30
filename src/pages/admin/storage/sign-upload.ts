export const prerender = false;

import type { APIRoute } from 'astro';
import { isCurrentUserAdmin, isSameOriginRequest } from '../../../lib/admin-auth';
import { ADMIN_IMAGE_BUCKETS, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '../../../lib/admin/constants';
import { isUuid } from '../../../lib/admin/query';
import { allocateAdminImagePath } from '../../../lib/admin/storage';
import { createSupabaseServerClient } from '../../../lib/supabase.server';

export const POST: APIRoute = async (context) => {
  if (!isSameOriginRequest(context.request)) {
    return json({ ok: false, error: 'This request could not be verified.' }, 403);
  }

  const supabase = createSupabaseServerClient(context);
  if (!(await isCurrentUserAdmin(supabase))) {
    return json({ ok: false, error: 'Admin access is required.' }, 403);
  }

  let body: unknown = {};
  try {
    body = await context.request.json();
  } catch {
    return json({ ok: false, error: 'Send a JSON upload request.' }, 400);
  }

  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const bucket = typeof record.bucket === 'string' ? record.bucket : '';
  const folder = typeof record.folder === 'string' ? record.folder.trim() : '';
  const filename = typeof record.filename === 'string' ? record.filename : '';
  const contentType = typeof record.contentType === 'string' ? record.contentType : '';
  const contentLength = typeof record.contentLength === 'number' ? record.contentLength : Number(record.contentLength);

  if (!ADMIN_IMAGE_BUCKETS.includes(bucket as (typeof ADMIN_IMAGE_BUCKETS)[number])) {
    return json({ ok: false, error: 'That image bucket is not allowed.' }, 400);
  }

  if (!isUuid(folder)) {
    return json({ ok: false, error: 'A valid image folder is required.' }, 400);
  }

  if (!ALLOWED_IMAGE_TYPES.includes(contentType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return json({ ok: false, error: 'Use a JPEG, PNG, WebP, AVIF, or GIF image.' }, 400);
  }

  if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > MAX_IMAGE_BYTES) {
    return json({ ok: false, error: 'Images must be 4MB or smaller.' }, 400);
  }

  const allocated = await allocateAdminImagePath(supabase, bucket, folder, filename, contentType);
  if ('error' in allocated) {
    return json({ ok: false, error: allocated.error }, 400);
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(allocated.path);
  if (error || !data) {
    return json({ ok: false, error: error?.message ?? 'Could not prepare the image upload.' }, 500);
  }

  return json({
    ok: true,
    bucket,
    path: data.path,
    token: data.token,
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
