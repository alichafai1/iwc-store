import { getCollection } from 'astro:content';
import { getAuthor } from '../data/authors';
import { editorialPages } from '../data/editorial';
import type { Article, ArticlePageData, EditorialKind, EditorialPageContent, EditorialPageResult } from '../types/article';
import type { Author } from '../types/author';

export const EDITORIAL_PAGE_SIZE = 9;

function collectionName(kind: EditorialKind): 'guides' | 'blog' {
  return kind === 'blog' ? 'blog' : 'guides';
}

function entryToArticle(
  kind: EditorialKind,
  entry: {
    data: {
      slug: string;
      title: string;
      description: string;
      category: string;
      image: string;
      imageAlt: string;
      date: Date;
      author: string;
      isPillar?: boolean;
    };
  },
): Article {
  const folder = collectionName(kind);
  return {
    slug: entry.data.slug,
    title: entry.data.title,
    excerpt: entry.data.description,
    category: entry.data.category,
    href: `/${folder}/${entry.data.slug}/`,
    image: entry.data.image,
    imageAlt: entry.data.imageAlt,
    kind,
    author: entry.data.author,
    publishedAt: entry.data.date.toISOString().slice(0, 10),
    featured: Boolean(entry.data.isPillar),
  };
}

export function getEditorialPageContent(kind: EditorialKind): EditorialPageContent {
  return editorialPages[kind];
}

export async function getEditorialItems(kind: EditorialKind): Promise<Article[]> {
  const entries = await getCollection(collectionName(kind));
  return [...entries]
    .sort((left, right) => right.data.date.getTime() - left.data.date.getTime())
    .map((entry) => entryToArticle(kind, entry));
}

export function getEditorialPagePath(basePath: string, page: number): string {
  return page <= 1 ? `${basePath}/` : `${basePath}/page/${page}/`;
}

export async function paginateEditorial(kind: EditorialKind, page: number): Promise<EditorialPageResult> {
  const items = await getEditorialItems(kind);
  const featured = page <= 1 ? items.find((item) => item.featured) ?? items[0] : undefined;
  const rest = featured ? items.filter((item) => item.slug !== featured.slug) : items;
  const totalPages = Math.max(1, Math.ceil(Math.max(rest.length, 1) / EDITORIAL_PAGE_SIZE));
  const current = Math.min(Math.max(page, 1), totalPages);
  const start = (current - 1) * EDITORIAL_PAGE_SIZE;
  const pageItems = items.length === 0 ? [] : rest.slice(start, start + EDITORIAL_PAGE_SIZE);

  return {
    featured: items.length > 0 ? featured : undefined,
    items: pageItems,
    page: current,
    totalPages: items.length === 0 ? 1 : totalPages,
    totalItems: items.length,
  };
}

export async function getEditorialPageNumbers(kind: EditorialKind): Promise<number[]> {
  const listing = await paginateEditorial(kind, 1);
  if (listing.totalItems === 0) {
    return [];
  }
  return Array.from({ length: listing.totalPages }, (_, index) => index + 1);
}

export function getRelatedArticles(_page: ArticlePageData): { same: Article[]; other: Article[] } {
  return { same: [], other: [] };
}

export function getArticleAuthor(page: ArticlePageData): Author | undefined {
  return getAuthor(page.authorSlug);
}

export async function getArticlesByAuthor(slug: string): Promise<Article[]> {
  const author = getAuthor(slug);
  if (!author) {
    return [];
  }

  const [guides, posts] = await Promise.all([getEditorialItems('guide'), getEditorialItems('blog')]);
  const names = new Set([author.slug.toLowerCase(), author.name.trim().toLowerCase()]);

  return [...guides, ...posts].filter((article) => names.has((article.author ?? '').trim().toLowerCase()));
}
