import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const faqItem = z.object({
  question: z.string(),
  answer: z.string(),
});

export const articleSchema = z.object({
  title: z.string(),
  description: z.string().max(155),
  slug: z.string(),
  date: z.coerce.date(),
  lastModified: z.coerce.date().optional(),
  author: z.string(),
  category: z.string(),
  tags: z.array(z.string()).default([]),
  image: z.string(),
  imageAlt: z.string(),
  primaryKeyword: z.string(),
  secondaryKeywords: z.array(z.string()).default([]),
  keyTakeaways: z.array(z.string()).min(5).max(7),
  faq: z.array(faqItem),
  relatedArticles: z.array(z.string()).default([]),
  pillar: z.string().optional(),
  isPillar: z.boolean().default(false),
});

const guides = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/guides',
  }),
  schema: articleSchema,
});

const blog = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/blog',
  }),
  schema: articleSchema,
});

export const PILLAR_SLUG = 'iwc-replica-watches-guide';

export const GUIDE_CLUSTER_SLUGS = [
  'iwc-superclone-guide',
  'iwc-big-pilot-replica',
  'iwc-top-gun-replica',
  'iwc-portugieser-replica',
  'iwc-portofino-replica',
  'iwc-mark-series-replica',
  'iwc-aquatimer-replica',
  'how-to-spot-fake-iwc',
  'iwc-serial-number-check',
  'iwc-knockoff-vs-replica',
  'best-iwc-replica-sellers',
  'iwc-watch-box-guide',
] as const;

export const collections = { guides, blog };
