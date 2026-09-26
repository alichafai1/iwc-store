// @ts-check
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import { isSitemapExcluded, sitemapCollectionPages } from './src/lib/seo.ts';
import { siteConfig } from './src/lib/site.ts';

// https://astro.build/config
export default defineConfig({
  site: siteConfig.url,
  output: 'static',
  adapter: node({
    mode: 'standalone',
  }),
  trailingSlash: 'always',
  server: {
    port: 4330,
    host: true,
  },
  build: {
    // Keep small CSS inlined; larger sheets stay cacheable hashed files.
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      cssCodeSplit: true,
      assetsInlineLimit: 4096,
    },
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !isSitemapExcluded(page),
      customPages: sitemapCollectionPages(),
    }),
  ],
});
