import { getCollection } from 'astro:content';
import internalLinksJson from '../data/internal-links.json';
import type {
  ContentCollectionName,
  InternalLinksMap,
  RelatedArticleCard,
} from '../types/content-article';

export const internalLinks = internalLinksJson as InternalLinksMap;

export function readingTimeMinutes(body: string | undefined): number {
  const words = (body ?? '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200) || 1);
}

export function collectionPath(collection: ContentCollectionName, slug: string): string {
  return `/${collection}/${slug}/`;
}

export async function resolveContentHref(slug: string): Promise<string> {
  const [guides, posts] = await Promise.all([getCollection('guides'), getCollection('blog')]);

  if (guides.some((entry) => entry.data.slug === slug || entry.id === slug)) {
    return collectionPath('guides', slug);
  }

  if (posts.some((entry) => entry.data.slug === slug || entry.id === slug)) {
    return collectionPath('blog', slug);
  }

  return collectionPath('guides', slug);
}

export async function getRelatedArticleCards(slugs: string[]): Promise<RelatedArticleCard[]> {
  const unique = [...new Set(slugs.filter(Boolean))];
  const [guides, posts] = await Promise.all([getCollection('guides'), getCollection('blog')]);
  const cards: RelatedArticleCard[] = [];

  for (const slug of unique) {
    const guide = guides.find((entry) => entry.data.slug === slug || entry.id === slug);
    const post = posts.find((entry) => entry.data.slug === slug || entry.id === slug);
    const entry = guide ?? post;

    if (!entry) {
      continue;
    }

    const collection: ContentCollectionName = guide ? 'guides' : 'blog';
    cards.push({
      slug: entry.data.slug,
      title: entry.data.title,
      description: entry.data.description,
      image: entry.data.image,
      imageAlt: entry.data.imageAlt,
      href: collectionPath(collection, entry.data.slug),
    });

    if (cards.length >= 4) {
      break;
    }
  }

  return cards;
}

export function linkHref(link: { to?: string; href?: string }): string {
  if (link.href) {
    return link.href;
  }

  if (link.to) {
    return collectionPath('guides', link.to);
  }

  return '/guides/';
}

export function slugFromInternalLink(link: { to?: string; href?: string }): string | undefined {
  if (link.to) {
    return link.to;
  }

  const match = link.href?.match(/^\/(?:guides|blog)\/([^/]+)\/?$/);
  return match?.[1];
}

export function clusterLinksFor(slug: string) {
  return internalLinks[slug]?.links ?? [];
}

export function mergeRelatedSlugs(frontmatterSlugs: string[], mapSlug: string): string[] {
  const fromMap = (internalLinks[mapSlug]?.links ?? [])
    .map((link) => slugFromInternalLink(link))
    .filter((slug): slug is string => Boolean(slug));
  return [...new Set([...frontmatterSlugs, ...fromMap])];
}
