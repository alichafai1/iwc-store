export const prerender = false;

import type { APIRoute } from 'astro';
import { getStorefrontProductSitemapEntries } from '../lib/catalog';
import { absoluteUrl } from '../lib/seo';

function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedSitemap: { body: string; expiresAt: number } | null = null;

const SITEMAP_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
};

export const GET: APIRoute = async () => {
  const now = Date.now();
  if (cachedSitemap && now < cachedSitemap.expiresAt) {
    return new Response(cachedSitemap.body, { headers: SITEMAP_HEADERS });
  }

  const entries = await getStorefrontProductSitemapEntries();
  const urls = entries
    .map(
      (entry) =>
        `  <url>\n    <loc>${xmlEscape(absoluteUrl(`/products/${entry.slug}/`))}</loc>\n    <lastmod>${entry.lastmod}</lastmod>\n  </url>`,
    )
    .join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  cachedSitemap = { body, expiresAt: now + CACHE_TTL_MS };

  return new Response(body, {
    headers: SITEMAP_HEADERS,
  });
};
