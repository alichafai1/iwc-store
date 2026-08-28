export const prerender = false;

import type { APIRoute } from 'astro';
import { siteConfig } from '../lib/site';

export const GET: APIRoute = () => {
  const origin = `${siteConfig.url}/`;
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /cart/
Disallow: /checkout/
Disallow: /admin/

Sitemap: ${new URL('sitemap-index.xml', origin).href}
Sitemap: ${new URL('sitemap-products.xml', origin).href}
`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
