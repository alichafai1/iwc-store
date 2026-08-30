import { createClient } from '@supabase/supabase-js';
import { MAX_IMAGE_BYTES, MAX_IMAGE_MB } from '../lib/admin/constants';
import { getSupabasePublicEnv } from '../lib/supabase-env';
import { validateImageFile } from '../lib/admin/storage';

const SIGN_UPLOAD_PATH = '/admin/storage/sign-upload/';

interface SignedUploadResponse {
  ok?: boolean;
  error?: string;
  bucket?: string;
  path?: string;
  token?: string;
}

function supabaseBrowser() {
  const { url, publishableKey } = getSupabasePublicEnv();
  return createClient(url, publishableKey);
}

function setStatus(element: Element | null, message: string, isError = false) {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  element.hidden = !message;
  element.textContent = message;
  element.classList.toggle('admin-image-status--error', isError);
}

function rowStatus(row: Element): HTMLElement | null {
  return row.querySelector('[data-image-row-status]');
}

function pathInput(row: Element): HTMLInputElement | null {
  const input = row.querySelector('input[name="image_paths"], input[name="uploaded_image_path"]');
  return input instanceof HTMLInputElement ? input : null;
}

function fileInput(row: Element): HTMLInputElement | null {
  const input = row.querySelector('[data-image-file], input[type="file"][name="image"]');
  return input instanceof HTMLInputElement ? input : null;
}

async function requestSignedUpload(
  bucket: string,
  folder: string,
  file: File,
): Promise<{ bucket: string; path: string; token: string }> {
  const response = await fetch(SIGN_UPLOAD_PATH, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      bucket,
      folder,
      filename: file.name,
      contentType: file.type,
      contentLength: file.size,
    }),
  });

  let payload: SignedUploadResponse = {};
  try {
    payload = (await response.json()) as SignedUploadResponse;
  } catch {
    payload = {};
  }

  if (!response.ok || !payload.ok || !payload.path || !payload.token || !payload.bucket) {
    throw new Error(payload.error || 'Could not prepare the image upload.');
  }

  return { bucket: payload.bucket, path: payload.path, token: payload.token };
}

async function uploadFile(bucket: string, folder: string, file: File): Promise<string> {
  const invalid = validateImageFile(file);
  if (invalid) {
    throw new Error(invalid);
  }

  const signed = await requestSignedUpload(bucket, folder, file);
  const { error } = await supabaseBrowser().storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });

  if (error) {
    throw new Error(error.message);
  }

  return signed.path;
}

async function uploadRow(row: Element, bucket: string, folder: string): Promise<void> {
  const input = fileInput(row);
  const file = input?.files?.[0];
  if (!file || !input) {
    return;
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`Images must be ${MAX_IMAGE_MB}MB or smaller.`);
  }

  row.setAttribute('data-image-uploading', '1');
  setStatus(rowStatus(row), 'Uploading…');

  try {
    const path = await uploadFile(bucket, folder, file);
    const stored = pathInput(row);
    if (stored) {
      stored.value = path;
    }

    input.value = '';
    setStatus(rowStatus(row), 'Uploaded');
  } finally {
    row.removeAttribute('data-image-uploading');
  }
}

function rowsNeedingUpload(root: Element): Element[] {
  return [...root.querySelectorAll('[data-image-row], [data-image-single]')].filter((row) => {
    const input = fileInput(row);
    return Boolean(input?.files?.length);
  });
}

function isBusy(root: Element): boolean {
  return Boolean(root.querySelector('[data-image-uploading]'));
}

async function flushUploads(root: Element): Promise<void> {
  const bucket = root.getAttribute('data-image-bucket') ?? '';
  const folder = root.getAttribute('data-image-folder') ?? '';
  if (!bucket || !folder) {
    throw new Error('Image upload is not configured.');
  }

  const rows = rowsNeedingUpload(root);
  for (const row of rows) {
    await uploadRow(row, bucket, folder);
  }
}

let started = false;

export function initAdminDirectImageUpload(): void {
  if (started) {
    return;
  }

  started = true;

  document.querySelectorAll<HTMLElement>('[data-image-uploader]').forEach((root) => {
    const addInput = root.querySelector('[data-image-add]');
    const list = root.querySelector('[data-image-list]');
    const bucket = root.getAttribute('data-image-bucket') ?? '';
    const folder = root.getAttribute('data-image-folder') ?? '';

    addInput?.addEventListener('change', () => {
      window.setTimeout(() => {
        if (!list) {
          return;
        }

        list.querySelectorAll('[data-image-row]').forEach((row) => {
          if (!fileInput(row)?.files?.length || row.hasAttribute('data-image-uploading')) {
            return;
          }

          uploadRow(row, bucket, folder).catch((error: unknown) => {
            const message = error instanceof Error ? error.message : 'Could not upload this image.';
            setStatus(rowStatus(row), message, true);
          });
        });
      }, 0);
    });

    const single = root.querySelector('[data-image-single]');
    const singleFile = single?.querySelector('input[type="file"][name="image"]');
    singleFile?.addEventListener('change', () => {
      if (!(single instanceof Element)) {
        return;
      }

      uploadRow(single, bucket, folder).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Could not upload this image.';
        setStatus(rowStatus(single), message, true);
      });
    });
  });

  document.addEventListener(
    'submit',
    (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.hasAttribute('data-admin-form')) {
        return;
      }

      if (form.dataset.imagesFlushed === '1') {
        return;
      }

      const roots = [...form.querySelectorAll('[data-image-uploader]')];
      if (roots.length === 0) {
        return;
      }

      const needsWork = roots.some((root) => rowsNeedingUpload(root).length > 0 || isBusy(root));
      if (!needsWork) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      const submitter = event.submitter;
      const status = form.querySelector('[data-image-form-status]');
      setStatus(status, 'Uploading images…');

      form.querySelectorAll('button[type="submit"]').forEach((button) => {
        if (button instanceof HTMLButtonElement) {
          button.disabled = true;
        }
      });

      Promise.all(roots.map((root) => flushUploads(root)))
        .then(() => {
          const failed = form.querySelector('.admin-image-status--error');
          if (failed) {
            throw new Error(failed.textContent || 'One or more images failed to upload.');
          }

          setStatus(status, '');
          form.dataset.imagesFlushed = '1';
          form.querySelectorAll('button[type="submit"]').forEach((button) => {
            if (button instanceof HTMLButtonElement) {
              button.disabled = false;
            }
          });

          if (submitter instanceof HTMLButtonElement) {
            form.requestSubmit(submitter);
          } else {
            form.requestSubmit();
          }
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Could not upload the images.';
          setStatus(status, message, true);
          form.querySelectorAll('button[type="submit"]').forEach((button) => {
            if (button instanceof HTMLButtonElement) {
              button.disabled = false;
            }
          });
        });
    },
    true,
  );
}
