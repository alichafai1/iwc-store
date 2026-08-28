import { z } from 'zod';

export const scrapeRequestSchema = z.object({
  url: z.string().trim().min(1, 'url is required'),
});

export const scrapeCollectionRequestSchema = z.object({
  url: z.string().trim().min(1, 'url is required'),
});

export const retryFailedRequestSchema = z.object({
  jobId: z.string().uuid('jobId must be a UUID'),
});

export const specificationSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

export const normalizedProductSchema = z.object({
  source_url: z.string().url(),
  source_domain: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  price: z.number().finite().nullable(),
  currency: z.string().nullable(),
  breadcrumbs: z.array(z.string().min(1)),
  specifications: z.array(specificationSchema),
  features: z.array(z.string().min(1)),
  collection_url: z.string().url().nullable(),
  collection_name: z.string().nullable(),
  model: z.string().nullable(),
  brand: z.string().nullable(),
  category: z.string().nullable(),
  primary_specs: z.array(specificationSchema),
  additional_information: z.array(specificationSchema),
  raw_data: z.record(z.string(), z.unknown()),
});

export const scrapeJobStatusSchema = z.enum(['pending', 'running', 'completed', 'failed']);
export type ScrapeJobStatus = z.infer<typeof scrapeJobStatusSchema>;

export type Specification = z.infer<typeof specificationSchema>;
export type NormalizedProduct = z.infer<typeof normalizedProductSchema>;

export const scrapeStatusSchema = z.enum(['pending', 'scraped', 'failed', 'processed']);
export type ScrapeStatus = z.infer<typeof scrapeStatusSchema>;
