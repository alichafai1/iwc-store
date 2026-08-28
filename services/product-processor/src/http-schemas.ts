import { z } from 'zod';

export const processCollectionRequestSchema = z.object({
  scrapeJobId: z.string().uuid(),
  reprocessExisting: z.boolean().optional(),
});

export const retryFailedRequestSchema = z.object({
  processingJobId: z.string().uuid(),
  rawProductId: z.string().uuid().optional(),
});
