import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { getSupabasePublicEnv } from '../supabase-env';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGE_MB } from './constants';

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

export function publicStorageUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }

  const { url } = getSupabasePublicEnv();
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}

export function validateImageFile(file: File): string | null {
  if (!file || file.size === 0) {
    return 'Choose an image file.';
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return `Images must be ${MAX_IMAGE_MB}MB or smaller.`;
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return 'Use a JPEG, PNG, WebP, AVIF, or GIF image.';
  }

  return null;
}

export async function uploadAdminImage(
  supabase: SupabaseClient<Database>,
  bucket: string,
  file: File,
  folder: string,
): Promise<{ path: string } | { error: string }> {
  const invalid = validateImageFile(file);
  if (invalid) {
    return { error: invalid };
  }

  const extension = IMAGE_EXTENSIONS[file.type] ?? 'bin';
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    return { error: error.message };
  }

  return { path };
}

export async function removeAdminImage(
  supabase: SupabaseClient<Database>,
  bucket: string,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) {
    return null;
  }

  const { error } = await supabase.storage.from(bucket).remove([path]);
  return error ? error.message : null;
}
