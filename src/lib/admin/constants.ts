import type { Enums } from '../../types/database';

export type ContentStatus = Enums<'content_status'>;

export const CONTENT_STATUSES = ['draft', 'review', 'published', 'archived'] as const;

export const PRODUCT_IMAGE_BUCKET = 'product-images';
export const COLLECTION_IMAGE_BUCKET = 'collection-images';

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
] as const;

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_IMAGE_MB = 4;

export const ADMIN_PRODUCTS_PATH = '/admin/products/';
export const ADMIN_COLLECTIONS_PATH = '/admin/collections/';
export const ADMIN_WORKFLOW_PATH = '/admin/product-workflow/';

export const KEYWORD_LIBRARY_ANCHOR = 'keyword-library';
export const KEYWORD_UPLOAD_ANCHOR = 'keyword-upload';
export const MAX_KEYWORD_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_KEYWORD_FILE_ROWS = 25_000;
export const MAX_KEYWORD_FILES = 20;
export const KEYWORD_LIBRARY_FETCH_PAGE_SIZE = 1_000;
