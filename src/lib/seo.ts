import { storeCollections } from '../data/collections';
import type { FaqItem } from '../types/faq';
import type { JsonLdNode, SeoInput } from '../types/seo';
import { plainFaqAnswer } from './faq-text';
import { siteConfig } from './site';

const INDEXABLE_ROBOTS = 'index, follow';
const NOINDEX_ROBOTS = 'noindex, nofollow';

export function absoluteUrl(path = '/'): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalized = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalized, `${siteConfig.url}/`).href;
}

export function buildPageTitle(title: string): string {
  if (title === siteConfig.name) {
    return title;
  }

  return `${title}${siteConfig.titleSeparator}${siteConfig.name}`;
}

export function buildRobots(input: Pick<SeoInput, 'robots' | 'noindex'>): string {
  if (input.robots) {
    return input.robots;
  }

  return input.noindex ? NOINDEX_ROBOTS : INDEXABLE_ROBOTS;
}

export function websiteJsonLd(): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
  };
}

export function organizationJsonLd(): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
  };
}

export function jsonLdGraph(nodes: JsonLdNode[]): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes,
  };
}

export function defaultJsonLd(): JsonLdNode {
  return jsonLdGraph([websiteJsonLd(), organizationJsonLd()]);
}

export function breadcrumbJsonLd(
  items: { name: string; path: string }[],
  options: { id?: string } = {},
): JsonLdNode {
  const node: JsonLdNode = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };

  if (options.id) {
    node['@id'] = options.id;
  }

  return node;
}

export function productJsonLd(input: {
  name: string;
  description: string;
  path: string;
  images: string[];
  price?: number;
  currency?: string;
  sku?: string;
  availability?: string;
  brand?: string;
}): JsonLdNode {
  const node: JsonLdNode = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
  };

  if (input.images.length > 0) {
    node.image = input.images.map((image) => (image.startsWith('http') ? image : absoluteUrl(image)));
  }

  if (input.brand) {
    node.brand = {
      '@type': 'Brand',
      name: input.brand,
    };
  }

  if (input.sku) {
    node.sku = input.sku;
  }

  if (input.price !== undefined) {
    const offer: JsonLdNode = {
      '@type': 'Offer',
      url: absoluteUrl(input.path),
      price: input.price,
      priceCurrency: input.currency ?? 'USD',
    };

    if (input.availability) {
      offer.availability = input.availability;
    }

    node.offers = offer;
  }

  return node;
}

export function articleJsonLd(input: {
  type?: 'Article' | 'BlogPosting';
  headline: string;
  description: string;
  path: string;
  image?: string;
  datePublished: string;
  dateModified: string;
  authorName: string;
  authorPath: string;
}): JsonLdNode {
  const node: JsonLdNode = {
    '@context': 'https://schema.org',
    '@type': input.type ?? 'Article',
    headline: input.headline,
    description: input.description,
    url: absoluteUrl(input.path),
    mainEntityOfPage: absoluteUrl(input.path),
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: {
      '@type': 'Person',
      name: input.authorName,
      url: absoluteUrl(input.authorPath),
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };

  if (input.image) {
    node.image = input.image.startsWith('http') ? input.image : absoluteUrl(input.image);
  }

  return node;
}

export function aboutPageJsonLd(input: {
  name: string;
  description: string;
  path: string;
  breadcrumbId?: string;
}): JsonLdNode {
  const url = absoluteUrl(input.path);
  const node: JsonLdNode = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': url,
    name: input.name,
    description: input.description,
    url,
    isPartOf: {
      '@type': 'WebSite',
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };

  if (input.breadcrumbId) {
    node.breadcrumb = { '@id': input.breadcrumbId };
  }

  return node;
}

export function collectionPageJsonLd(input: {
  name: string;
  description: string;
  path: string;
  type?: 'CollectionPage' | 'Blog';
  image?: string;
  breadcrumbId?: string;
  mainEntityId?: string;
}): JsonLdNode {
  const url = absoluteUrl(input.path);
  const node: JsonLdNode = {
    '@context': 'https://schema.org',
    '@type': input.type ?? 'CollectionPage',
    '@id': url,
    name: input.name,
    description: input.description,
    url,
  };

  if (input.image) {
    node.image = input.image.startsWith('http') ? input.image : absoluteUrl(input.image);
  }

  if (input.breadcrumbId) {
    node.breadcrumb = { '@id': input.breadcrumbId };
  }

  if (input.mainEntityId) {
    node.mainEntity = { '@id': input.mainEntityId };
  }

  return node;
}

export function itemListJsonLd(input: {
  id: string;
  items: { name: string; path: string }[];
}): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': input.id,
    numberOfItems: input.items.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: input.items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

export function faqPageJsonLd(items: FaqItem[]): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: plainFaqAnswer(item.answer),
      },
    })),
  };
}

export const sitemapExcludedPaths = ['/cart/', '/checkout/', '/robots.txt'] as const;

export function sitemapCollectionPages(): string[] {
  return [
    absoluteUrl('/shop/'),
    absoluteUrl('/collections/'),
    ...storeCollections.map((collection) => absoluteUrl(`/collections/${collection.slug}/`)),
  ];
}

export function isSitemapExcluded(pageUrl: string): boolean {
  const pathname = new URL(pageUrl).pathname;
  const withSlash = pathname.endsWith('/') ? pathname : `${pathname}/`;

  if (withSlash === '/admin/' || withSlash.startsWith('/admin/')) {
    return true;
  }

  if (withSlash.startsWith('/products/')) {
    return true;
  }

  return sitemapExcludedPaths.some((path) => withSlash === path || pathname === path);
}
