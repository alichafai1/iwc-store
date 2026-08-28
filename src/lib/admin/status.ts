import { CONTENT_STATUSES, type ContentStatus } from './constants';

export type { ContentStatus };

export function isContentStatus(value: string): value is ContentStatus {
  return (CONTENT_STATUSES as readonly string[]).includes(value);
}

export function publishedAtForStatus(
  nextStatus: ContentStatus,
  currentPublishedAt: string | null | undefined,
): string | null {
  if (nextStatus === 'published') {
    return currentPublishedAt ?? new Date().toISOString();
  }

  return currentPublishedAt ?? null;
}

export function togglePublishStatus(current: ContentStatus): ContentStatus {
  return current === 'published' ? 'draft' : 'published';
}
