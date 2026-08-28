import type { Specification } from '../../schemas.js';

const ADDITIONAL_LABEL_ALIASES: Record<string, string> = {
  attachment: 'Attachment',
  brand: 'Brand',
  'case diameter': 'Case Diameter',
  casediameter: 'Case Diameter',
  'case material': 'Case Material',
  casematerial: 'Case Material',
  'case thickness': 'Case Thickness',
  casethickness: 'Case Thickness',
  category: 'Category',
  clasp: 'Clasp',
  'dial colour': 'Dial Colour',
  dialcolour: 'Dial Colour',
  'dial color': 'Dial Colour',
  'gross weight': 'Gross Weight',
  grossweight: 'Gross Weight',
  'mirror material': 'Mirror Material',
  mirrormaterial: 'Mirror Material',
  model: 'Model',
  'model number': 'Model Number',
  modelnumber: 'Model Number',
  movement: 'Movement',
  'net weigh': 'Net Weight',
  netweigh: 'Net Weight',
  'net weight': 'Net Weight',
  netweight: 'Net Weight',
  'power reserve': 'Power Reserve',
  powerreserve: 'Power Reserve',
  series: 'Series',
  'strap colour': 'Strap Colour',
  strapcolour: 'Strap Colour',
  'strap color': 'Strap Colour',
  'strap material': 'Strap Material',
  strapmaterial: 'Strap Material',
  'water resistance': 'Water Resistance',
  waterresistance: 'Water Resistance',
};

function aliasKey(label: string): string {
  return label.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeAdditionalLabel(label: string): string {
  const trimmed = label.replace(/\s+/g, ' ').trim().replace(/[:：]\s*$/, '');
  if (!trimmed) {
    return '';
  }

  const spaced = aliasKey(trimmed);
  const compact = spaced.replace(/ /g, '');
  return ADDITIONAL_LABEL_ALIASES[spaced] ?? ADDITIONAL_LABEL_ALIASES[compact] ?? trimmed;
}

/**
 * Parse "Label:Value,Label:Value" blobs. Values may contain commas, so splits
 * only happen when the next token looks like a new Label:.
 */
export function parseLabeledBlob(text: string, normalizeLabels = false): Specification[] {
  const source = text.replace(/\s+/g, ' ').trim();
  if (!source) {
    return [];
  }

  const chunks = source.split(/,(?=[A-Za-z][A-Za-z0-9 +/.-]{0,40}:)/);
  const specs: Specification[] = [];

  for (const chunk of chunks) {
    const separator = chunk.indexOf(':');
    if (separator <= 0) {
      continue;
    }

    const rawLabel = chunk.slice(0, separator).trim();
    const value = chunk.slice(separator + 1).trim();
    const label = normalizeLabels ? normalizeAdditionalLabel(rawLabel) : rawLabel.replace(/\s+/g, ' ').trim();
    if (label && value) {
      specs.push({ label, value });
    }
  }

  return specs;
}

export function omitReviewFields(raw: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (/review|comment|rating|customer/i.test(key)) {
      continue;
    }

    clean[key] = value;
  }

  return clean;
}
