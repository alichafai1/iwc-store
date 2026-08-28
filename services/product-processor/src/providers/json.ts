export function extractJsonValue(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('The model returned an empty response.');
  }

  const attempts = [trimmed];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    attempts.push(fenced[1].trim());
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    attempts.push(trimmed.slice(start, end + 1));
  }

  let lastError: unknown;
  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    lastError instanceof Error ? `The model returned malformed JSON: ${lastError.message}` : 'The model returned malformed JSON.',
  );
}

export function parseAgentJsonStdout(stdout: string): { resultText: string; raw: Record<string, unknown> } {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new Error('Cursor Agent CLI returned empty stdout.');
  }

  const lines = trimmed
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const jsonLine = [...lines].reverse().find((line) => line.startsWith('{') && line.endsWith('}'));
  const payload = jsonLine ?? trimmed;

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return { resultText: trimmed, raw: {} };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { resultText: trimmed, raw: {} };
  }

  const record = parsed as Record<string, unknown>;
  if (record.is_error === true || record.isError === true) {
    const message = typeof record.result === 'string' ? record.result : 'Cursor Agent CLI returned an error result.';
    throw new Error(message);
  }

  if (typeof record.result === 'string') {
    return { resultText: record.result, raw: record };
  }

  if (record.message && typeof record.message === 'object' && !Array.isArray(record.message)) {
    const message = record.message as Record<string, unknown>;
    const content = message.content;
    if (Array.isArray(content)) {
      const text = content
        .map((item) =>
          item && typeof item === 'object' && 'text' in item && typeof (item as { text?: unknown }).text === 'string'
            ? (item as { text: string }).text
            : '',
        )
        .join('');
      if (text.trim()) {
        return { resultText: text, raw: record };
      }
    }
  }

  return { resultText: trimmed, raw: record };
}
