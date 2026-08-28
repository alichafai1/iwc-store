// @ts-check
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import { defineConfig } from 'astro/config';
import { isSitemapExcluded, sitemapCollectionPages } from './src/lib/seo.ts';
import { siteConfig } from './src/lib/site.ts';

// https://astro.build/config
export default defineConfig({
  site: siteConfig.url,
  output: 'static',
  adapter: vercel(),
  trailingSlash: 'always',
  server: {
    port: 4330,
    host: true,
  },
  integrations: [
    sitemap({
      filter: (page) => !isSitemapExcluded(page),
      customPages: sitemapCollectionPages(),
    }),
  ],
});
