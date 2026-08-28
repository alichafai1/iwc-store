import { isContentStatus, type ContentStatus } from './status';

export function formString(form: FormData, name: string): string {
  return String(form.get(name) ?? '').trim();
}

export function formStringList(form: FormData, name: string): string[] {
  return form.getAll(name).map((value) => String(value));
}

export function formOptional(form: FormData, name: string): string | null {
  const value = formString(form, name);
  return value.length > 0 ? value : null;
}

export function formLines(form: FormData, name: string): string[] {
  return formString(form, name)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function formBoolean(form: FormData, name: string): boolean {
  return form.get(name) === 'true' || form.get(name) === 'on';
}

export function formStatus(form: FormData, fallback: ContentStatus = 'draft'): ContentStatus {
  const intents = form.getAll('intent').map((value) => String(value).trim()).filter(Boolean);
  if (intents.includes('published')) {
    return 'published';
  }

  const fromIntent = intents.find((intent) => isContentStatus(intent));
  if (fromIntent) {
    return fromIntent;
  }

  const status = formString(form, 'status');
  return isContentStatus(status) ? status : fallback;
}

export function parseNonNegativeNumber(value: string, label: string): number | { error: string } {
  if (value.trim() === '') {
    return { error: `${label} is required.` };
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { error: `${label} must be a number that is 0 or greater.` };
  }

  return parsed;
}

export function parseNonNegativeInteger(value: string, label: string): number | { error: string } {
  const parsed = parseNonNegativeNumber(value, label);
  if (typeof parsed === 'object') {
    return parsed;
  }

  if (!Number.isInteger(parsed)) {
    return { error: `${label} must be a whole number.` };
  }

  return parsed;
}

export function parseIntegerInRange(
  value: string,
  label: string,
  min: number,
  max: number,
): number | { error: string } {
  const parsed = parseNonNegativeInteger(value, label);
  if (typeof parsed === 'object') {
    return parsed;
  }

  if (parsed < min || parsed > max) {
    return { error: `${label} must be between ${min} and ${max}.` };
  }

  return parsed;
}

export function uniqueConstraintMessage(error: { code?: string; message?: string }, field: string): string | null {
  if (error.code === '23505') {
    return `That ${field} is already in use.`;
  }

  return error.message ?? null;
}
