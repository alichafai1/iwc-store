function envValue(name: string): string {
  const fromImport =
    typeof import.meta !== 'undefined' && import.meta.env
      ? String((import.meta.env as Record<string, unknown>)[name] ?? '').trim()
      : '';
  const fromProcess = typeof process !== 'undefined' ? (process.env[name] ?? '').trim() : '';
  return fromImport || fromProcess;
}

function normalizeSiteUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return '';
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function resolveSiteUrl(): string {
  const configured = normalizeSiteUrl(envValue('PUBLIC_SITE_URL') || envValue('SITE'));
  if (configured) {
    return configured;
  }

  const vercelProduction = normalizeSiteUrl(envValue('VERCEL_PROJECT_PRODUCTION_URL'));
  if (vercelProduction) {
    return vercelProduction;
  }

  return 'https://example.com';
}

export const siteConfig = {
  name: 'Store',
  url: resolveSiteUrl(),
  locale: 'en',
  titleSeparator: ' | ',
} as const;

export type SiteConfig = typeof siteConfig;
