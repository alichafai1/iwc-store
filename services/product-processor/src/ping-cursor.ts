import { pingSchema, preferGrok46, resolveCursorContentModel } from './providers/cursor-gpt.js';
import { extractJsonValue, parseAgentJsonStdout } from './providers/json.js';
import { createContentAiProvider } from './providers/index.js';
import { loadEnv } from './env.js';

function assertLocalZodParse(): void {
  const wrapped = JSON.stringify({
    type: 'result',
    subtype: 'success',
    is_error: false,
    result: '```json\n{"ok":true,"source":"cursor-grok"}\n```',
  });
  const parsedCli = parseAgentJsonStdout(wrapped);
  const jsonValue = extractJsonValue(parsedCli.resultText);
  pingSchema.parse(jsonValue);
}

async function main() {
  assertLocalZodParse();
  console.log('zod_parse=ok');

  const env = loadEnv();
  console.log(`provider=${env.contentAiProvider}`);
  console.log(`openai_required=${env.contentAiProvider === 'openai'}`);

  if (env.contentAiProvider !== 'cursor') {
    throw new Error('CONTENT_AI_PROVIDER must be cursor for this connectivity test.');
  }

  try {
    const model = await resolveCursorContentModel(env);
    console.log(`requested_model=${model}`);
    if (!/grok/i.test(model)) {
      throw new Error(`Resolved model "${model}" is not a Grok slug.`);
    }
    if (!preferGrok46([model]) && !/grok/i.test(model)) {
      throw new Error(`Resolved model "${model}" is not a Grok slug.`);
    }

    const provider = await createContentAiProvider(env);
    const result = await provider.generateJson({
      system: 'You are a connectivity probe. Return only JSON. Do not edit files or run commands.',
      user: 'Return exactly {"ok":true,"source":"cursor-grok"}.',
      schemaName: 'cursor_connectivity_ping',
      validator: pingSchema,
    });
    console.log(`live_call=ok model=${result.meta.model} duration_ms=${result.meta.durationMs}`);
    if (!/grok/i.test(result.meta.model)) {
      throw new Error(`Live call used "${result.meta.model}" instead of Grok.`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`live_call=failed ${message}`);
    process.exitCode = 2;
  }
}

void main();
