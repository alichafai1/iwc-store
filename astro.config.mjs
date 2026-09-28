// @ts-check
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import { isSitemapExcluded, sitemapCollectionPages } from './src/lib/seo.ts';
import { siteConfig } from './src/lib/site.ts';

const siteOrigin = siteConfig.url.endsWith('/') ? siteConfig.url : `${siteConfig.url}/`;

// https://astro.build/config
export default defineConfig({
  site: siteConfig.url,
  output: 'static',
  adapter: node({
    mode: 'standalone',
  }),
  trailingSlash: 'always',
  redirects: {
    '/guides/how-to-spot-fake-iwc/': {
      status: 301,
      destination: '/guides/iwc-replica-watches-guide/#how-to-spot-a-fake-iwc',
    },
    '/guides/best-iwc-replica-sellers/': {
      status: 301,
      destination: '/guides/iwc-replica-watches-guide/#where-to-buy-iwc-replicas-safely',
    },
    '/guides/iwc-serial-number-check/': {
      status: 301,
      destination: '/guides/iwc-replica-watches-guide/#iwc-serial-number-check',
    },
  },
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
      // SSR product sitemap is generated at runtime; include it in the static index.
      customSitemaps: [new URL('sitemap-products.xml', siteOrigin).href],
    }),
  ],
});
