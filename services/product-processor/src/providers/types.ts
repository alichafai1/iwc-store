import type { z } from 'zod';

export type ContentAiProviderName = 'cursor' | 'openai';

export interface ContentAiCallMeta {
  provider: ContentAiProviderName;
  model: string;
  attempt: number;
  durationMs: number;
  success: boolean;
}

export interface GenerateJsonRequest<T> {
  system: string;
  user: string;
  schemaName: string;
  validator: z.ZodType<T>;
  jsonOnlyInstruction?: string;
}

export interface GenerateJsonResult<T> {
  data: T;
  meta: ContentAiCallMeta;
}

export interface ContentAiProvider {
  readonly name: ContentAiProviderName;
  readonly model: string;
  generateJson<T>(request: GenerateJsonRequest<T>): Promise<GenerateJsonResult<T>>;
}
