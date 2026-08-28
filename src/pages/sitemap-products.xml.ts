export const prerender = false;

import type { APIRoute } from 'astro';
import { getStorefrontProductSlugs } from '../lib/catalog';
import { absoluteUrl } from '../lib/seo';

function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export const GET: APIRoute = async () => {
  const slugs = await getStorefrontProductSlugs();
  const urls = slugs
    .map((slug) => `  <url>\n    <loc>${xmlEscape(absoluteUrl(`/products/${slug}/`))}</loc>\n  </url>`)
    .join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
