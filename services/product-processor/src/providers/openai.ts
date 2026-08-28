import OpenAI from 'openai';
import type { ProcessorEnv } from '../env.js';
import { ProcessorError } from '../errors.js';
import { withRetries } from '../pool.js';
import { extractJsonValue } from './json.js';
import type { ContentAiProvider, GenerateJsonRequest, GenerateJsonResult } from './types.js';

export function createOpenAiProvider(env: ProcessorEnv): ContentAiProvider {
  if (!env.openaiApiKey) {
    throw new ProcessorError('OPENAI_API_KEY is required when CONTENT_AI_PROVIDER=openai.', {
      statusCode: 500,
      code: 'openai_key_missing',
    });
  }

  const client = new OpenAI({
    apiKey: env.openaiApiKey,
    timeout: env.cursorTimeoutMs,
    maxRetries: 0,
  });

  return {
    name: 'openai',
    model: env.openaiModel,
    async generateJson<T>(request: GenerateJsonRequest<T>): Promise<GenerateJsonResult<T>> {
      return withRetries(
        env.maxAttempts,
        1_500,
        async (attempt) => {
          const started = Date.now();
          const response = await client.responses.create({
            model: env.openaiModel,
            input: [
              { role: 'system', content: request.system },
              { role: 'user', content: request.user },
            ],
          });
          const text = response.output_text?.trim();
          if (!text) {
            throw new ProcessorError('The model returned an empty response.', { statusCode: 422, code: 'malformed_model_output' });
          }
          const jsonValue = extractJsonValue(text);
          const parsed = request.validator.safeParse(jsonValue);
          if (!parsed.success) {
            throw new ProcessorError(
              `Model output failed validation: ${parsed.error.issues[0]?.message ?? 'invalid JSON.'}`,
              { statusCode: 422, code: 'malformed_model_output' },
            );
          }
          const durationMs = Date.now() - started;
          console.info(
            `[ai] provider=openai model=${env.openaiModel} schema=${request.schemaName} success=true attempt=${attempt} duration_ms=${durationMs}`,
          );
          return {
            data: parsed.data,
            meta: { provider: 'openai', model: env.openaiModel, attempt, durationMs, success: true },
          };
        },
        (error) => {
          const message = error instanceof Error ? error.message.toLowerCase() : '';
          return message.includes('timeout') || message.includes('rate limit') || message.includes('malformed');
        },
      );
    },
  };
}
