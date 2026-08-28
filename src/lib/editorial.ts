import { getArticlePage, getArticlePages } from '../data/article-pages';
import { getAuthor } from '../data/authors';
import { demoBlogPosts, demoGuides, editorialPages } from '../data/editorial';
import type { Article, ArticlePageData, EditorialKind, EditorialPageContent, EditorialPageResult } from '../types/article';
import type { Author } from '../types/author';

export const EDITORIAL_PAGE_SIZE = 3;

export function getEditorialPageContent(kind: EditorialKind): EditorialPageContent {
  return editorialPages[kind];
}

export function getEditorialItems(kind: EditorialKind): Article[] {
  return kind === 'blog' ? demoBlogPosts : demoGuides;
}

export function getEditorialPagePath(basePath: string, page: number): string {
  return page <= 1 ? `${basePath}/` : `${basePath}/page/${page}/`;
}

export function paginateEditorial(kind: EditorialKind, page: number): EditorialPageResult {
  const items = getEditorialItems(kind);
  const featured = items.find((item) => item.featured) ?? items[0];
  const rest = items.filter((item) => item.slug !== featured?.slug);
  const totalPages = Math.max(1, Math.ceil(rest.length / EDITORIAL_PAGE_SIZE));
  const current = Math.min(Math.max(page, 1), totalPages);
  const start = (current - 1) * EDITORIAL_PAGE_SIZE;

  return {
    featured: current === 1 ? featured : undefined,
    items: rest.slice(start, start + EDITORIAL_PAGE_SIZE),
    page: current,
    totalPages,
    totalItems: rest.length,
  };
}

export function getEditorialPageNumbers(kind: EditorialKind): number[] {
  const { totalPages } = paginateEditorial(kind, 1);
  return Array.from({ length: totalPages }, (_, index) => index + 1);
}

export function getEditorialArticle(kind: EditorialKind, slug: string): ArticlePageData | undefined {
  return getArticlePage(kind, slug);
}

export function getEditorialArticlePaths(kind: EditorialKind) {
  return getArticlePages(kind).map((page) => ({
    params: { slug: page.article.slug },
    props: { page },
  }));
}

export function getRelatedArticles(page: ArticlePageData): { same: Article[]; other: Article[] } {
  const sameKind = page.article.kind === 'blog' ? demoBlogPosts : demoGuides;
  const otherKind = page.article.kind === 'blog' ? demoGuides : demoBlogPosts;

  return {
    same: page.relatedSlugs
      .map((slug) => sameKind.find((item) => item.slug === slug))
      .filter((item): item is Article => Boolean(item)),
    other: page.relatedOtherSlugs
      .map((slug) => otherKind.find((item) => item.slug === slug))
      .filter((item): item is Article => Boolean(item)),
  };
}

export function getArticleAuthor(page: ArticlePageData): Author | undefined {
  return getAuthor(page.authorSlug);
}

export function getArticlesByAuthor(slug: string): Article[] {
  return getArticlePages()
    .filter((page) => page.authorSlug === slug)
    .map((page) => page.article);
}
