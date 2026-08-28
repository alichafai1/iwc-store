import { InvalidUrlError } from './errors.js';

export function canonicalizeProductUrl(input: string): URL {
  let parsed: URL;

  try {
    parsed = new URL(input.trim());
  } catch {
    throw new InvalidUrlError();
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new InvalidUrlError('Only http and https product URLs are supported.');
  }

  if (!parsed.hostname) {
    throw new InvalidUrlError();
  }

  parsed.hash = '';
  parsed.username = '';
  parsed.password = '';

  if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }

  return parsed;
}

export function sourceDomain(url: URL): string {
  return url.hostname.replace(/^www\./, '');
}
