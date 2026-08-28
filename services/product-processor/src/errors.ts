export class ProcessorError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, options?: { statusCode?: number; code?: string; cause?: unknown }) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = 'ProcessorError';
    this.statusCode = options?.statusCode ?? 500;
    this.code = options?.code ?? 'processor_failed';
  }
}

export class UnauthorizedError extends ProcessorError {
  constructor() {
    super('Missing or invalid processor API key.', { statusCode: 401, code: 'unauthorized' });
    this.name = 'UnauthorizedError';
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Unknown processor error.';
}

export function isRetryableAiError(error: unknown): boolean {
  const code = error instanceof ProcessorError ? error.code : '';
  if (code === 'cursor_auth' || code === 'cursor_model_unavailable' || code === 'openai_key_missing' || code === 'cursor_usage_limit') {
    return false;
  }

  const status =
    error && typeof error === 'object' && 'status' in error
      ? Number((error as { status?: number }).status)
      : NaN;
  if (status === 429 || status === 408 || status >= 500) {
    return true;
  }

  const message = errorMessage(error).toLowerCase();
  return (
    message.includes('rate limit') ||
    message.includes('timeout') ||
    message.includes('temporar') ||
    message.includes('overloaded') ||
    message.includes('econnreset') ||
    message.includes('malformed json') ||
    isTransientDbError(error)
  );
}

export function isTransientDbError(error: unknown): boolean {
  const message = errorMessage(error).toLowerCase();
  return (
    message.includes('jwt issued at future') ||
    message.includes('issued at future') ||
    message.includes('fetch failed') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('socket hang up')
  );
}

export const isRetryableOpenAiError = isRetryableAiError;
