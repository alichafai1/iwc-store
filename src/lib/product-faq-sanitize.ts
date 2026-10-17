import type { FaqItem } from '../types/faq';
import type { ProductSpec } from '../types/product';

/** Intentional commercial SEO phrases — keep on the site, never all on every PDP FAQ. */
export const TARGET_SEO_KEYWORDS = [
  'fake IWC',
  'IWC knockoff',
  'replika IWC',
  'first copy',
  'clone watches',
] as const;

const TARGET_KEYWORD_RE =
  /\b(?:fake\s+iwc|iwc\s+knockoff|replika\s+iwc|first\s+copy|clone\s+watches)\b/gi;

/** Broader synonym spam the AI stuffed into nearly every product FAQ. */
const SYNONYM_SPAM_RE =
  /\b(?:fake\s+iwc|iwc\s+knockoff|knockoff\s+watches|replika\s+iwc|first\s+copy|clone\s+watches|iwc\s+clone(?:\s+watch(?:es)?)?|iwc\s+copy(?:\s+watch(?:es)?)?|iwc\s+watch\s+fake|iwc\s+watch(?:es)?\s+replicas?|iwc\s+imitation|iwc\s+lookalike|super\s*clone|iwc\s+watch\s+knockoff)\b/i;

const SYNONYM_DEFINITION_RE =
  /\b(?:what does .+ mean|same (?:idea|offer|as|intent)|i (?:searched|also searched)|those (?:searches|phrases)|are .+ the same|point(?:s)? at the same|shopping (?:labels?|language|phrases?))\b/i;

export type ProductFaqContext = {
  slug: string;
  title: string;
  shortDescription?: string | null;
  sku?: string | null;
  specs: ProductSpec[];
};

type TerminologyVariant = {
  keyword: (typeof TARGET_SEO_KEYWORDS)[number];
  question: (ctx: { title: string; reference: string }) => string;
  answer: (ctx: { title: string; reference: string }) => string;
};

const TERMINOLOGY_VARIANTS: TerminologyVariant[] = [
  {
    keyword: 'fake IWC',
    question: ({ reference }) =>
      `Is this a fake IWC watch or a replica of the ${reference}?`,
    answer: ({ title, reference }) =>
      `Shoppers often type “fake IWC” when they mean a replica of a named reference. This page is ${title}: a replica of ${reference} with the published Top 1:1 Clone grade and the specifications listed here—not a genuine IWC Schaffhausen watch.`,
  },
  {
    keyword: 'IWC knockoff',
    question: ({ reference }) =>
      `How does an IWC knockoff differ from this ${reference} replica?`,
    answer: ({ title, reference }) =>
      `“IWC knockoff” is a common search phrase for low- to mid-tier copies. This listing is ${title}, published as a Top 1:1 Clone replica of ${reference}. Use the specs and photos on this page—not the search nickname alone—to judge fit, movement, and finishing.`,
  },
  {
    keyword: 'replika IWC',
    question: ({ reference }) =>
      `What does replika IWC mean for the ${reference}?`,
    answer: ({ title, reference }) =>
      `“Replika IWC” is simply another spelling of replica IWC. For ${reference}, that means ${title} with the movement, case, and dial details published in the specification table on this page.`,
  },
  {
    keyword: 'first copy',
    question: ({ reference }) =>
      `Is this a first copy of the ${reference}?`,
    answer: ({ title, reference }) =>
      `“First copy” is shopping language for a closer visual match than a loosely inspired piece. ${title} is listed as Top 1:1 Clone for ${reference}; confirm diameter, movement, crystal, and photos before you order.`,
  },
  {
    keyword: 'clone watches',
    question: ({ reference }) =>
      `Is this one of the clone watches based on the ${reference}?`,
    answer: ({ title, reference }) =>
      `Yes—“clone watches” is catalog language for a closer case and dial match. ${title} follows the ${reference} layout with the Top 1:1 Clone grade and the product-specific specs below.`,
  },
];

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function extractProductReference(input: {
  title: string;
  slug: string;
  sku?: string | null;
}): string {
  const fromSku = input.sku?.match(/\bIW[\dA-Z]{4,}\b/i)?.[0];
  if (fromSku) {
    return fromSku.toUpperCase();
  }

  const fromTitle = input.title.match(/\bIW[\dA-Z]{4,}\b/i)?.[0];
  if (fromTitle) {
    return fromTitle.toUpperCase();
  }

  const fromSlug = input.slug.match(/iw[\dA-Z]{4,}/i)?.[0];
  if (fromSlug) {
    return fromSlug.toUpperCase();
  }

  return input.title;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function terminologyVariantForSlug(slug: string): TerminologyVariant {
  return TERMINOLOGY_VARIANTS[hashString(slug) % TERMINOLOGY_VARIANTS.length];
}

function countTargetKeywordHits(text: string): number {
  const matches = text.match(TARGET_KEYWORD_RE);
  return matches?.length ?? 0;
}

function countSynonymHits(text: string): number {
  const re = new RegExp(SYNONYM_SPAM_RE.source, 'gi');
  return text.match(re)?.length ?? 0;
}

/**
 * FAQs that exist mainly to repeat synonym keywords / equate search phrases.
 * Plain “IWC replica” product-fact questions are kept; target-synonym cascades are not.
 * A fresh terminology FAQ is added separately (one rotated keyword per product).
 */
export function isKeywordSpamFaq(question: string, answer: string): boolean {
  const q = normalizeWhitespace(question);
  const a = normalizeWhitespace(answer);
  const combined = `${q} ${a}`;

  // Any question built around the stuffed synonym cluster is spam.
  if (SYNONYM_SPAM_RE.test(q)) {
    return true;
  }

  if (SYNONYM_DEFINITION_RE.test(q) || SYNONYM_DEFINITION_RE.test(a)) {
    return true;
  }

  // Answers that pile synonym phrases were part of the stuffing pattern.
  if (countSynonymHits(combined) >= 2 || countTargetKeywordHits(combined) >= 2) {
    return true;
  }

  return false;
}

function findSpec(specs: ProductSpec[], ...labels: string[]): ProductSpec | undefined {
  const needles = labels.map((label) => label.toLowerCase());
  return specs.find((spec) => needles.some((needle) => spec.label.toLowerCase().includes(needle)));
}

function buildUsefulFaqs(ctx: ProductFaqContext): FaqItem[] {
  const reference = extractProductReference(ctx);
  const faqs: FaqItem[] = [];

  faqs.push({
    question: `Which reference is this replica based on?`,
    answer: `${ctx.title} follows reference ${reference}. Confirm the case, dial, and movement details in the specification table on this page before ordering.`,
  });

  const movement = findSpec(ctx.specs, 'movement');
  if (movement) {
    faqs.push({
      question: `What movement does the ${reference} use?`,
      answer: `This listing publishes the movement as ${movement.value}. That is the calibre information for this replica of ${reference}, not an official IWC factory certificate.`,
    });
  }

  const diameter = findSpec(ctx.specs, 'case diameter', 'diameter', 'case size');
  if (diameter) {
    faqs.push({
      question: `What is the case size of this ${reference}?`,
      answer: `The published case size is ${diameter.value}. Check lug-to-lug photos on the gallery if you are comparing wrist fit to another Pilot, Portugieser, or Aquatimer reference.`,
    });
  }

  const water = findSpec(ctx.specs, 'water resistance', 'water');
  if (water) {
    faqs.push({
      question: `What water resistance is listed for this model?`,
      answer: `Water resistance is published as ${water.value}. Treat that as the catalog rating for this replica and avoid relying on it for professional diving unless the product copy and QC notes say otherwise.`,
    });
  }

  const crystal = findSpec(ctx.specs, 'crystal');
  const caseMaterial = findSpec(ctx.specs, 'case material', 'case');
  if (crystal || caseMaterial) {
    const parts = [
      caseMaterial ? `case material ${caseMaterial.value}` : null,
      crystal ? `crystal ${crystal.value}` : null,
    ].filter(Boolean);
    faqs.push({
      question: `What materials and crystal does this ${reference} use?`,
      answer: `This page lists ${parts.join(' and ')}. Those rows are the factual build details for ${ctx.title}.`,
    });
  }

  const dial = findSpec(ctx.specs, 'dial', 'dial layout');
  const functions = findSpec(ctx.specs, 'functions', 'complications');
  if (dial || functions) {
    const detail = [dial?.value, functions?.value].filter(Boolean).join('; ');
    faqs.push({
      question: `What dial layout and functions are on this ${reference}?`,
      answer: `Published details: ${detail}. Use the product photos together with these rows to verify the layout matches the reference you want.`,
    });
  }

  const strap = findSpec(ctx.specs, 'strap', 'bracelet', 'band');
  if (strap) {
    faqs.push({
      question: `What strap or bracelet comes with this watch?`,
      answer: `The listing shows ${strap.value}. Confirm clasp type and length in the gallery if strap fit matters for your wrist.`,
    });
  }

  faqs.push({
    question: 'How do QC and shipping work for this watch?',
    answer:
      'After you order, the watch goes through inspection before dispatch. Review the QC photos when they are sent, then shipping follows the timeline on the product and checkout pages. Contact support if you need a detail checked before the watch leaves QC.',
  });

  return faqs.slice(0, 6);
}

function buildTerminologyFaq(ctx: ProductFaqContext): FaqItem {
  const reference = extractProductReference(ctx);
  const variant = terminologyVariantForSlug(ctx.slug);
  return {
    question: variant.question({ title: ctx.title, reference }),
    answer: variant.answer({ title: ctx.title, reference }),
  };
}

function faqUsesTargetKeyword(faq: FaqItem, keyword: string): boolean {
  const haystack = `${faq.question} ${faq.answer}`.toLowerCase();
  return haystack.includes(keyword.toLowerCase());
}

/**
 * Keep useful product FAQs, drop synonym-stuffed rows, and ensure exactly one
 * rotated target-keyword terminology FAQ per product (sitewide distribution).
 */
export function sanitizeProductFaqs(
  existing: FaqItem[] | undefined,
  ctx: ProductFaqContext,
): FaqItem[] {
  const kept = (existing ?? [])
    .map((faq) => ({
      question: normalizeWhitespace(faq.question),
      answer: normalizeWhitespace(faq.answer),
    }))
    .filter((faq) => faq.question && faq.answer && !isKeywordSpamFaq(faq.question, faq.answer));

  const useful = buildUsefulFaqs(ctx);
  const terminology = buildTerminologyFaq(ctx);
  const variant = terminologyVariantForSlug(ctx.slug);

  const merged: FaqItem[] = [];
  const seenQuestions = new Set<string>();

  const pushUnique = (faq: FaqItem) => {
    const key = faq.question.toLowerCase();
    if (seenQuestions.has(key)) {
      return;
    }
    seenQuestions.add(key);
    merged.push(faq);
  };

  // Prefer kept product-fact FAQs first (rare after AI stuffing), then generated useful ones.
  for (const faq of kept) {
    pushUnique(faq);
  }
  for (const faq of useful) {
    if (merged.length >= 5) {
      break;
    }
    pushUnique(faq);
  }

  const alreadyHasVariantKeyword = merged.some((faq) => faqUsesTargetKeyword(faq, variant.keyword));
  if (!alreadyHasVariantKeyword) {
    // Place terminology FAQ near the top so it remains visible without dominating.
    merged.splice(Math.min(1, merged.length), 0, terminology);
  }

  // Cap length; drop extras that are not the terminology FAQ.
  if (merged.length > 7) {
    const termQ = terminology.question.toLowerCase();
    const term = merged.find((faq) => faq.question.toLowerCase() === termQ);
    const rest = merged.filter((faq) => faq.question.toLowerCase() !== termQ).slice(0, 6);
    return term ? [rest[0], term, ...rest.slice(1)].filter(Boolean).slice(0, 7) : rest;
  }

  return merged;
}

export function targetKeywordCounts(text: string): Record<(typeof TARGET_SEO_KEYWORDS)[number], number> {
  const lower = text.toLowerCase();
  const counts = {} as Record<(typeof TARGET_SEO_KEYWORDS)[number], number>;
  for (const keyword of TARGET_SEO_KEYWORDS) {
    const needle = keyword.toLowerCase();
    let count = 0;
    let index = 0;
    while (index < lower.length) {
      const found = lower.indexOf(needle, index);
      if (found === -1) {
        break;
      }
      count += 1;
      index = found + needle.length;
    }
    counts[keyword] = count;
  }
  return counts;
}
