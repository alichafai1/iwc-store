export class ScraperError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, options?: { statusCode?: number; code?: string; cause?: unknown }) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = 'ScraperError';
    this.statusCode = options?.statusCode ?? 500;
    this.code = options?.code ?? 'scrape_failed';
  }
}

export class InvalidUrlError extends ScraperError {
  constructor(message = 'A valid http(s) product URL is required.') {
    super(message, { statusCode: 400, code: 'invalid_url' });
    this.name = 'InvalidUrlError';
  }
}

export class TimeoutError extends ScraperError {
  constructor(message = 'The product page did not respond in time.') {
    super(message, { statusCode: 504, code: 'timeout' });
    this.name = 'TimeoutError';
  }
}

export class UnsupportedPageError extends ScraperError {
  constructor(message = 'The page did not contain enough product data to scrape.') {
    super(message, { statusCode: 422, code: 'unsupported_page' });
    this.name = 'UnsupportedPageError';
  }
}

export class UnauthorizedError extends ScraperError {
  constructor() {
    super('Missing or invalid scraper API key.', { statusCode: 401, code: 'unauthorized' });
    this.name = 'UnauthorizedError';
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Unknown scrape error.';
}
