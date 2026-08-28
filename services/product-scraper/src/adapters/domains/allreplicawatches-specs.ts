import type { CheerioAPI } from 'cheerio';
import type { AnyNode } from 'domhandler';
import { firstText, uniqueSpecs, type AdapterInput, type Specification } from '../types.js';

const NAMED_SPEC_HEADINGS =
  /^(?:(?:key|watch|product)\s+)?(?:build details|technical overview|specifications|product details|watch details)$/i;

const COMPARISON_TEXT =
  /superclone|\baaa\b(?:\s*grade)?|\ba\s*grade\b|comparison|\bvs\.?\b|quality grade/i;

const SKIP_LABEL =
  /^(?:feature|features|superclone|aaa(?:\s*grade)?|a grade|why choose(?: us)?|add to cart|price)$/i;

const HEADER_VALUES = /^(?:value|details?|specification|spec|feature|features)$/i;

function normalizeHeading(text: string): string {
  return text.replace(/\u00a0/g, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
}

export function isSpecificationHeading(text: string | undefined): boolean {
  const value = normalizeHeading(text ?? '');
  if (!value) {
    return false;
  }

  if (NAMED_SPEC_HEADINGS.test(value)) {
    return true;
  }

  // Variants such as "Case & Movement Specs" or "Technical Specs".
  return /\bspec(?:ification)?s\b/i.test(value) && !/\bcompar/i.test(value) && !/\bvs\.?\b/i.test(value);
}

function headingTag(element: AnyNode): string {
  const tag = 'tagName' in element && typeof element.tagName === 'string' ? element.tagName : '';
  return tag.toLowerCase();
}

function toProductSpec(label: string, value: string): Specification | null {
  const cleanLabel = label.replace(/\s+/g, ' ').trim().replace(/[:：]\s*$/, '');
  const cleanValue = value.replace(/\s+/g, ' ').trim();
  if (!cleanLabel || !cleanValue || cleanLabel.length > 80) {
    return null;
  }

  if (SKIP_LABEL.test(cleanLabel) || HEADER_VALUES.test(cleanValue)) {
    return null;
  }

  return { label: cleanLabel, value: cleanValue };
}

function parseColonPair(text: string | undefined): Specification | null {
  const value = firstText(text);
  if (!value) {
    return null;
  }

  const separator = value.search(/[:：]/);
  if (separator <= 0) {
    return null;
  }

  return toProductSpec(value.slice(0, separator), value.slice(separator + 1));
}

function parseListItem($: CheerioAPI, element: AnyNode): Specification | null {
  const node = $(element);
  const strong = node.find('strong, b').first();
  if (strong.length) {
    const label = firstText(strong.text());
    const full = firstText(node.text());
    if (label && full) {
      const index = full.toLowerCase().indexOf(label.toLowerCase());
      const rest =
        index >= 0 ? full.slice(index + label.length).replace(/^[:：\-\s]+/, '') : '';
      const spec = toProductSpec(label, rest);
      if (spec) {
        return spec;
      }
    }
  }

  return parseColonPair(node.text());
}

function isComparisonOrMarketingTable($: CheerioAPI, table: AnyNode): boolean {
  const headers = $(table)
    .find('tr')
    .first()
    .find('th, td')
    .toArray()
    .map((cell) => firstText($(cell).text()) ?? '')
    .filter(Boolean);

  if (headers.length >= 3) {
    return true;
  }

  const joined = headers.join(' ');
  if (COMPARISON_TEXT.test(joined)) {
    return true;
  }

  return headers.length === 2 && COMPARISON_TEXT.test(headers[1] ?? '');
}

function parseTableSpecs($: CheerioAPI, table: AnyNode): Specification[] {
  if (isComparisonOrMarketingTable($, table)) {
    return [];
  }

  const specs: Specification[] = [];
  $(table)
    .find('tr')
    .each((_, row) => {
      const values = $(row)
        .find('th, td')
        .toArray()
        .map((cell) => firstText($(cell).text()) ?? '')
        .filter(Boolean);
      if (values.length >= 3) {
        return;
      }

      const spec = toProductSpec(values[0] ?? '', values[1] ?? '');
      if (spec) {
        specs.push(spec);
      }
    });

  return specs;
}

function parseDefinitionList($: CheerioAPI, list: AnyNode): Specification[] {
  const specs: Specification[] = [];
  $(list)
    .find('dt')
    .each((_, dt) => {
      const spec = toProductSpec(
        firstText($(dt).text()) ?? '',
        firstText($(dt).nextAll('dd').first().text()) ?? '',
      );
      if (spec) {
        specs.push(spec);
      }
    });
  return specs;
}

function collectSection($: CheerioAPI, heading: AnyNode): AnyNode[] {
  const node = $(heading);
  const stop = headingTag(heading) === 'h3' ? 'h2, h3' : 'h2';
  const direct = node.nextUntil(stop).toArray();
  if (direct.length) {
    return direct;
  }

  let cursor = node;
  for (let depth = 0; depth < 6; depth += 1) {
    if (cursor.next().length) {
      break;
    }

    const parent = cursor.parent();
    if (!parent.length || parent.is('body, html')) {
      break;
    }

    cursor = parent;
  }

  const nodes: AnyNode[] = [];
  cursor.nextAll().each((_, element) => {
    const sibling = $(element);
    if (sibling.is(stop)) {
      return false;
    }

    if (sibling.find(stop).length) {
      return false;
    }

    nodes.push(element);
  });

  return nodes;
}

function extractFromSection($: CheerioAPI, nodes: AnyNode[]): Specification[] {
  const specs: Specification[] = [];

  for (const node of nodes) {
    const current = $(node);
    const lists = current.is('ul, ol') ? current : current.find('ul, ol');
    lists.find('li').each((_, item) => {
      const spec = parseListItem($, item);
      if (spec) {
        specs.push(spec);
      }
    });

    const tables = current.is('table') ? current : current.find('table');
    tables.each((_, table) => {
      specs.push(...parseTableSpecs($, table));
    });

    const definitions = current.is('dl') ? current : current.find('dl');
    definitions.each((_, list) => {
      specs.push(...parseDefinitionList($, list));
    });
  }

  return specs;
}

export function parseProductSpecifications(input: AdapterInput): Specification[] {
  const { $ } = input;
  const specs: Specification[] = [];

  $('h2, h3').each((_, heading) => {
    if (!isSpecificationHeading($(heading).text())) {
      return;
    }

    specs.push(...extractFromSection($, collectSection($, heading)));
  });

  return uniqueSpecs(specs);
}
