import { parse as parseCsv } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { MAX_KEYWORD_FILE_BYTES, MAX_KEYWORD_FILE_ROWS, MAX_KEYWORD_FILES } from './constants';

export type KeywordFileType = 'csv' | 'xlsx';

export interface ParsedKeywordRow {
  keyword: string;
  normalizedKeyword: string;
  searchVolume: number | null;
  keywordDifficulty: number | null;
  intent: string | null;
  cpc: number | null;
  position: number | null;
  rawMetrics: Record<string, string>;
}

export interface KeywordParseSuccess {
  ok: true;
  fileName: string;
  fileType: KeywordFileType;
  keywordColumn: string;
  totalRows: number;
  validRows: ParsedKeywordRow[];
  invalidRows: number;
  inFileDuplicates: number;
}

export interface KeywordParseFailure {
  ok: false;
  error: string;
}

export type KeywordParseResult = KeywordParseSuccess | KeywordParseFailure;

const KEYWORD_HEADERS = ['keyword', 'keywords', 'query', 'search term', 'search_term', 'phrase'];

const METRIC_HEADERS: Record<Exclude<keyof ParsedKeywordRow, 'keyword' | 'normalizedKeyword' | 'rawMetrics'>, string[]> = {
  searchVolume: ['search volume', 'volume', 'searchvolume', 'vol', 'avg monthly searches', 'average monthly searches'],
  keywordDifficulty: ['keyword difficulty', 'kd', 'difficulty', 'keyword difficulty kd'],
  intent: ['intent', 'search intent', 'keyword intent'],
  cpc: ['cpc', 'cost per click', 'avg cpc', 'average cpc'],
  position: ['position', 'ranking position', 'rank', 'ranking', 'current position'],
};

export function normalizeKeyword(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_./-]+/g, ' ').replace(/\s+/g, ' ');
}

export function detectFileType(fileName: string, mimeType = ''): KeywordFileType | null {
  const name = fileName.trim().toLowerCase();
  const mime = mimeType.trim().toLowerCase();

  if (name.endsWith('.xlsx')) {
    return 'xlsx';
  }

  if (name.endsWith('.csv')) {
    return 'csv';
  }

  if (
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'application/vnd.ms-excel'
  ) {
    return 'xlsx';
  }

  if (mime === 'text/csv' || mime === 'text/plain') {
    return 'csv';
  }

  return null;
}

export function collectKeywordUploadFiles(form: FormData): File[] | { error: string } {
  const files = form
    .getAll('keyword_files')
    .filter((value): value is File => value instanceof File && value.name.trim().length > 0 && value.size > 0);

  if (files.length === 0) {
    return { error: 'Choose one or more CSV or XLSX keyword files.' };
  }

  if (files.length > MAX_KEYWORD_FILES) {
    return { error: `Upload at most ${MAX_KEYWORD_FILES} files at a time.` };
  }

  return files;
}

export async function parseKeywordFile(file: File): Promise<KeywordParseResult> {
  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false, error: 'Choose a CSV or XLSX keyword file.' };
  }

  if (file.size > MAX_KEYWORD_FILE_BYTES) {
    return {
      ok: false,
      error: `That file is larger than ${Math.round(MAX_KEYWORD_FILE_BYTES / (1024 * 1024))} MB.`,
    };
  }

  const fileType = detectFileType(file.name, file.type);
  if (!fileType) {
    return { ok: false, error: 'Upload a .csv or .xlsx file.' };
  }

  let records: Record<string, string>[];
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    records = fileType === 'csv' ? parseCsvRecords(buffer) : parseXlsxRecords(buffer);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? `Could not read that spreadsheet: ${error.message}` : 'Could not read that spreadsheet.',
    };
  }

  if (records.length === 0) {
    return { ok: false, error: 'That file has no data rows.' };
  }

  if (records.length > MAX_KEYWORD_FILE_ROWS) {
    return {
      ok: false,
      error: `That file has more than ${MAX_KEYWORD_FILE_ROWS.toLocaleString()} rows.`,
    };
  }

  const headers = Object.keys(records[0] ?? {});
  const keywordColumn = detectKeywordColumn(headers);
  if (!keywordColumn) {
    return {
      ok: false,
      error: 'No keyword column was found. Use a header such as Keyword, Query, Search term, or Phrase.',
    };
  }

  const metricColumns = detectMetricColumns(headers, keywordColumn);
  const validRows: ParsedKeywordRow[] = [];
  let invalidRows = 0;
  const seen = new Set<string>();
  let inFileDuplicates = 0;

  for (const record of records) {
    const keyword = String(record[keywordColumn] ?? '').trim();
    const normalizedKeyword = normalizeKeyword(keyword);
    if (!normalizedKeyword) {
      invalidRows += 1;
      continue;
    }

    if (seen.has(normalizedKeyword)) {
      inFileDuplicates += 1;
    }
    seen.add(normalizedKeyword);

    const rawMetrics: Record<string, string> = {};
    for (const [header, value] of Object.entries(record)) {
      if (header === keywordColumn) {
        continue;
      }
      if (Object.values(metricColumns).includes(header)) {
        continue;
      }
      const text = value.trim();
      if (text) {
        rawMetrics[header] = text;
      }
    }

    validRows.push({
      keyword,
      normalizedKeyword,
      searchVolume: parseOptionalNumber(metricColumns.searchVolume ? record[metricColumns.searchVolume] : ''),
      keywordDifficulty: parseOptionalNumber(
        metricColumns.keywordDifficulty ? record[metricColumns.keywordDifficulty] : '',
      ),
      intent: parseOptionalText(metricColumns.intent ? record[metricColumns.intent] : ''),
      cpc: parseOptionalNumber(metricColumns.cpc ? record[metricColumns.cpc] : ''),
      position: parseOptionalNumber(metricColumns.position ? record[metricColumns.position] : ''),
      rawMetrics,
    });
  }

  if (validRows.length === 0) {
    return { ok: false, error: 'That file has no valid keywords.' };
  }

  return {
    ok: true,
    fileName: file.name.trim() || `keywords.${fileType}`,
    fileType,
    keywordColumn,
    totalRows: records.length,
    validRows,
    invalidRows,
    inFileDuplicates,
  };
}

function parseCsvRecords(buffer: Buffer): Record<string, string>[] {
  const text = stripBom(buffer.toString('utf8'));
  if (!text.trim()) {
    return [];
  }

  const delimiters = [',', ';', '\t'];
  let best: Record<string, string>[] = [];
  let bestScore = -1;

  for (const delimiter of delimiters) {
    const rows = parseCsv(text, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
      bom: true,
      delimiter,
    }) as Record<string, unknown>[];

    const records = rows.map(stringifyRecord);
    const headers = Object.keys(records[0] ?? {});
    const score = headers.length + (detectKeywordColumn(headers) ? 100 : 0);
    if (score > bestScore) {
      best = records;
      bestScore = score;
    }
  }

  return best;
}

function parseXlsxRecords(buffer: Buffer): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('The workbook has no sheets.');
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error('The first sheet is empty.');
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
    blankrows: false,
  });

  return rows.map(stringifyRecord);
}

function stringifyRecord(row: Record<string, unknown>): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const header = String(key).trim();
    if (!header) {
      continue;
    }
    record[header] = value == null ? '' : String(value).trim();
  }
  return record;
}

function detectKeywordColumn(headers: string[]): string | null {
  const normalized = headers.map((header) => ({ header, key: normalizeHeader(header) }));
  for (const candidate of KEYWORD_HEADERS) {
    const match = normalized.find((item) => item.key === normalizeHeader(candidate));
    if (match) {
      return match.header;
    }
  }
  return null;
}

function detectMetricColumns(
  headers: string[],
  keywordColumn: string,
): Partial<Record<keyof typeof METRIC_HEADERS, string>> {
  const mapped: Partial<Record<keyof typeof METRIC_HEADERS, string>> = {};
  const normalized = headers
    .filter((header) => header !== keywordColumn)
    .map((header) => ({ header, key: normalizeHeader(header) }));

  for (const [field, aliases] of Object.entries(METRIC_HEADERS) as Array<
    [keyof typeof METRIC_HEADERS, string[]]
  >) {
    for (const alias of aliases) {
      const match = normalized.find((item) => item.key === normalizeHeader(alias));
      if (match) {
        mapped[field] = match.header;
        break;
      }
    }
  }

  return mapped;
}

function parseOptionalNumber(value: string | undefined): number | null {
  const text = (value ?? '').trim();
  if (!text || /^(—|-|n\/?a|na|null|none|undefined)$/i.test(text)) {
    return null;
  }

  const cleaned = text.replace(/[%$,\s]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalText(value: string | undefined): string | null {
  const text = (value ?? '').trim();
  if (!text || /^(—|-|n\/?a|na|null|none)$/i.test(text)) {
    return null;
  }
  return text;
}

function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}
