import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { getSupabasePublicEnv } from '../supabase-env';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGE_MB } from './constants';

export const IMAGE_EXTENSIONS: Record<string, string> = {
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

export function sanitizeImageBasename(originalName: string): string {
  const trimmed = originalName.trim();
  const lastDot = trimmed.lastIndexOf('.');
  const rawBase = lastDot > 0 ? trimmed.slice(0, lastDot) : trimmed;

  const basename = rawBase
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

  return basename || 'image';
}

export function shortUniqueSuffix(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 4);
}

function isDuplicateObjectError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('already exists') ||
    normalized.includes('duplicate') ||
    normalized.includes('resource exists')
  );
}

async function storageObjectExists(
  supabase: SupabaseClient<Database>,
  bucket: string,
  folder: string,
  filename: string,
): Promise<boolean> {
  const { data } = await supabase.storage.from(bucket).list(folder, {
    search: filename,
    limit: 100,
  });

  return (data ?? []).some((item) => item.name === filename);
}

export async function allocateAdminImagePath(
  supabase: SupabaseClient<Database>,
  bucket: string,
  folder: string,
  originalName: string,
  contentType: string,
): Promise<{ path: string } | { error: string }> {
  const extension = IMAGE_EXTENSIONS[contentType];
  if (!extension) {
    return { error: 'Use a JPEG, PNG, WebP, AVIF, or GIF image.' };
  }

  const basename = sanitizeImageBasename(originalName);
  let filename = `${basename}.${extension}`;

  if (await storageObjectExists(supabase, bucket, folder, filename)) {
    filename = `${basename}-${shortUniqueSuffix()}.${extension}`;
  }

  return { path: `${folder}/${filename}` };
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
  const basename = sanitizeImageBasename(file.name);
  let filename = `${basename}.${extension}`;

  if (await storageObjectExists(supabase, bucket, folder, filename)) {
    filename = `${basename}-${shortUniqueSuffix()}.${extension}`;
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) {
      filename = `${basename}-${shortUniqueSuffix()}.${extension}`;
    }

    const path = `${folder}/${filename}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

    if (!error) {
      return { path };
    }

    if (!isDuplicateObjectError(error.message) || attempt === 3) {
      return { error: error.message };
    }
  }

  return { error: 'Could not store the image with a unique filename.' };
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
