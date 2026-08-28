import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json, Tables } from '../../types/database';
import { KEYWORD_LIBRARY_FETCH_PAGE_SIZE } from './constants';
import type { KeywordFileType, ParsedKeywordRow } from './keyword-parse';
import type {
  KeywordBatchPreview,
  KeywordFileImportResult,
  KeywordFilePreview,
} from './keyword-preview-store';

export type KeywordRecord = Tables<'keywords'>;
export type KeywordImportRecord = Tables<'keyword_imports'>;

export async function countKeywords(supabase: SupabaseClient<Database>): Promise<number> {
  const { count } = await supabase.from('keywords').select('id', { count: 'exact', head: true });
  return count ?? 0;
}

export async function listKeywordImports(
  supabase: SupabaseClient<Database>,
): Promise<{ data: KeywordImportRecord[]; error: string | null }> {
  const { data, error } = await supabase
    .from('keyword_imports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data ?? [], error: null };
}

export async function existingNormalizedKeywords(
  supabase: SupabaseClient<Database>,
  values: string[],
): Promise<Set<string>> {
  const unique = [...new Set(values.filter(Boolean))];
  const found = new Set<string>();

  for (let index = 0; index < unique.length; index += 200) {
    const chunk = unique.slice(index, index + 200);
    const { data, error } = await supabase
      .from('keywords')
      .select('normalized_keyword')
      .in('normalized_keyword', chunk);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of data ?? []) {
      if (row.normalized_keyword) {
        found.add(row.normalized_keyword);
      }
    }
  }

  return found;
}

export function estimateFileDuplicates(
  file: Pick<KeywordFilePreview, 'validRows'>,
  knownNormalized: Set<string>,
): number {
  const seenInFile = new Set<string>();
  let duplicates = 0;

  for (const row of file.validRows) {
    if (seenInFile.has(row.normalizedKeyword) || knownNormalized.has(row.normalizedKeyword)) {
      duplicates += 1;
    }
    seenInFile.add(row.normalizedKeyword);
  }

  return duplicates;
}

export function rememberNormalizedKeywords(
  knownNormalized: Set<string>,
  rows: ParsedKeywordRow[],
): void {
  for (const row of rows) {
    knownNormalized.add(row.normalizedKeyword);
  }
}

/**
 * Phase 2 GPT retrieval helper. Loads the complete Global Keyword Library
 * in pages so a later processor can analyze every keyword without this UI.
 */
export async function listAllGlobalKeywords(
  supabase: SupabaseClient<Database>,
): Promise<{ data: KeywordRecord[]; error: string | null }> {
  const rows: KeywordRecord[] = [];
  let from = 0;

  while (true) {
    const to = from + KEYWORD_LIBRARY_FETCH_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('keywords')
      .select('*')
      .order('normalized_keyword', { ascending: true })
      .range(from, to);

    if (error) {
      return { data: [], error: error.message };
    }

    const page = data ?? [];
    rows.push(...page);
    if (page.length < KEYWORD_LIBRARY_FETCH_PAGE_SIZE) {
      break;
    }
    from += KEYWORD_LIBRARY_FETCH_PAGE_SIZE;
  }

  return { data: rows, error: null };
}

export async function importKeywordBatch(
  supabase: SupabaseClient<Database>,
  batch: KeywordBatchPreview,
): Promise<{ results: KeywordFileImportResult[] }> {
  const known = await existingNormalizedKeywords(
    supabase,
    batch.files.flatMap((file) => file.validRows.map((row) => row.normalizedKeyword)),
  );
  const results: KeywordFileImportResult[] = [];

  for (const file of batch.files) {
    if (file.error || file.validRows.length === 0) {
      await recordFailedImport(supabase, file);
      results.push({
        fileName: file.fileName,
        status: 'failed',
        error: file.error || 'That file has no valid keywords.',
        imported: 0,
        duplicates: 0,
      });
      continue;
    }

    const result = await importKeywordFile(supabase, file, known);
    results.push(result);
    if (result.status === 'completed') {
      rememberNormalizedKeywords(known, file.validRows);
    }
  }

  return { results };
}

async function importKeywordFile(
  supabase: SupabaseClient<Database>,
  file: KeywordFilePreview,
  knownNormalized: Set<string>,
): Promise<KeywordFileImportResult> {
  const fileType: KeywordFileType = file.fileType ?? 'csv';
  const { data: importRow, error: createError } = await supabase
    .from('keyword_imports')
    .insert({
      file_name: file.fileName,
      file_type: fileType,
      total_rows: file.totalRows,
      imported_rows: 0,
      duplicate_rows: 0,
      status: 'processing',
    })
    .select('id')
    .single();

  if (createError || !importRow) {
    return {
      fileName: file.fileName,
      status: 'failed',
      error: createError?.message || 'Could not start the keyword import.',
      imported: 0,
      duplicates: 0,
    };
  }

  try {
    const merged = new Map<string, ParsedKeywordRow>();
    let duplicateRows = 0;

    for (const row of file.validRows) {
      const current = merged.get(row.normalizedKeyword);
      if (current || knownNormalized.has(row.normalizedKeyword)) {
        duplicateRows += 1;
      }
      if (!current) {
        merged.set(row.normalizedKeyword, {
          ...row,
          rawMetrics: { ...row.rawMetrics },
        });
        continue;
      }

      current.searchVolume = row.searchVolume ?? current.searchVolume;
      current.keywordDifficulty = row.keywordDifficulty ?? current.keywordDifficulty;
      current.intent = row.intent ?? current.intent;
      current.cpc = row.cpc ?? current.cpc;
      current.position = row.position ?? current.position;
      current.rawMetrics = { ...current.rawMetrics, ...row.rawMetrics };
    }

    const uniqueRows = [...merged.values()];
    for (let index = 0; index < uniqueRows.length; index += 8) {
      const chunk = uniqueRows.slice(index, index + 8);
      const rpcResults = await Promise.all(
        chunk.map((row) =>
          supabase.rpc('upsert_global_keyword', {
            p_keyword: row.keyword,
            p_search_volume: row.searchVolume,
            p_keyword_difficulty: row.keywordDifficulty,
            p_intent: row.intent,
            p_cpc: row.cpc,
            p_position: row.position,
            p_source_import_id: importRow.id,
            p_raw_metrics: row.rawMetrics as Json,
          }),
        ),
      );
      const failed = rpcResults.find((result) => result.error);
      if (failed?.error) {
        throw new Error(failed.error.message);
      }
    }

    const { error: completeError } = await supabase
      .from('keyword_imports')
      .update({
        status: 'completed',
        imported_rows: uniqueRows.length,
        duplicate_rows: duplicateRows,
        completed_at: new Date().toISOString(),
      })
      .eq('id', importRow.id);

    if (completeError) {
      throw new Error(completeError.message);
    }

    return {
      fileName: file.fileName,
      status: 'completed',
      error: null,
      imported: uniqueRows.length,
      duplicates: duplicateRows,
    };
  } catch (error) {
    await supabase
      .from('keyword_imports')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', importRow.id);

    return {
      fileName: file.fileName,
      status: 'failed',
      error: error instanceof Error ? error.message : 'The keyword import failed.',
      imported: 0,
      duplicates: 0,
    };
  }
}

async function recordFailedImport(
  supabase: SupabaseClient<Database>,
  file: KeywordFilePreview,
): Promise<void> {
  await supabase.from('keyword_imports').insert({
    file_name: file.fileName,
    file_type: file.fileType ?? 'csv',
    total_rows: file.totalRows,
    imported_rows: 0,
    duplicate_rows: 0,
    status: 'failed',
    completed_at: new Date().toISOString(),
  });
}

export async function resetKeywordLibrary(
  supabase: SupabaseClient<Database>,
): Promise<string | null> {
  const { error: keywordsError } = await supabase.from('keywords').delete().not('id', 'is', null);
  if (keywordsError) {
    return keywordsError.message;
  }

  const { error: importsError } = await supabase.from('keyword_imports').delete().not('id', 'is', null);
  if (importsError) {
    return importsError.message;
  }

  return null;
}
