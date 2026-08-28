import type { KeywordFileType, ParsedKeywordRow } from './keyword-parse';

const PREVIEW_TTL_MS = 30 * 60 * 1000;

export interface KeywordFilePreview {
  fileName: string;
  fileType: KeywordFileType | null;
  error: string | null;
  totalRows: number;
  invalidRows: number;
  estimatedDuplicates: number;
  validRows: ParsedKeywordRow[];
}

export interface KeywordBatchPreview {
  id: string;
  userId: string;
  createdAt: number;
  files: KeywordFilePreview[];
}

export interface KeywordFileImportResult {
  fileName: string;
  status: 'completed' | 'failed';
  error: string | null;
  imported: number;
  duplicates: number;
}

export interface KeywordBatchResult {
  id: string;
  userId: string;
  createdAt: number;
  files: KeywordFileImportResult[];
}

const previews = new Map<string, KeywordBatchPreview>();
const results = new Map<string, KeywordBatchResult>();

export function saveKeywordBatchPreview(
  preview: Omit<KeywordBatchPreview, 'id' | 'createdAt'>,
): string {
  pruneExpired();
  const id = crypto.randomUUID();
  previews.set(id, { ...preview, id, createdAt: Date.now() });
  return id;
}

export function getKeywordBatchPreview(id: string, userId: string): KeywordBatchPreview | null {
  pruneExpired();
  const preview = previews.get(id);
  if (!preview || preview.userId !== userId) {
    return null;
  }
  return preview;
}

export function consumeKeywordBatchPreview(id: string, userId: string): KeywordBatchPreview | null {
  const preview = getKeywordBatchPreview(id, userId);
  if (!preview) {
    return null;
  }
  previews.delete(id);
  return preview;
}

export function saveKeywordBatchResult(result: Omit<KeywordBatchResult, 'id' | 'createdAt'>): string {
  pruneExpired();
  const id = crypto.randomUUID();
  results.set(id, { ...result, id, createdAt: Date.now() });
  return id;
}

export function getKeywordBatchResult(id: string, userId: string): KeywordBatchResult | null {
  pruneExpired();
  const result = results.get(id);
  if (!result || result.userId !== userId) {
    return null;
  }
  return result;
}

function pruneExpired() {
  const cutoff = Date.now() - PREVIEW_TTL_MS;
  for (const [id, preview] of previews) {
    if (preview.createdAt < cutoff) {
      previews.delete(id);
    }
  }
  for (const [id, result] of results) {
    if (result.createdAt < cutoff) {
      results.delete(id);
    }
  }
}
