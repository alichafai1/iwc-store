import type { ProcessorEnv } from '../env.js';
import { ProcessorError } from '../errors.js';
import { createCursorGptProvider, resolveCursorContentModel } from './cursor-gpt.js';
import { createOpenAiProvider } from './openai.js';
import type { ContentAiProvider } from './types.js';

export async function createContentAiProvider(env: ProcessorEnv): Promise<ContentAiProvider> {
  if (env.contentAiProvider === 'openai') {
    return createOpenAiProvider(env);
  }

  if (env.contentAiProvider !== 'cursor') {
    throw new ProcessorError(`Unsupported CONTENT_AI_PROVIDER "${env.contentAiProvider}". Use cursor or openai.`, {
      statusCode: 500,
      code: 'invalid_provider',
    });
  }

  const model = await resolveCursorContentModel(env);
  return createCursorGptProvider(env, model);
}

export type { ContentAiProvider } from './types.js';
