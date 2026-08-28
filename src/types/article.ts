import type { ImageMetadata } from 'astro';
import type { FaqItem } from './faq';

export type EditorialKind = 'blog' | 'guide';

export type ArticleCategory = string;

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  category: ArticleCategory;
  href: string;
  image: ImageMetadata;
  imageAlt: string;
  kind: EditorialKind;
  publishedAt?: string;
  featured?: boolean;
  demo?: boolean;
}

export interface EditorialPageContent {
  kind: EditorialKind;
  title: string;
  intro: string;
  metaTitle: string;
  metaDescription: string;
  note: string;
  linkLabel: string;
  showDate: boolean;
  basePath: string;
}

export interface EditorialPageResult {
  featured?: Article;
  items: Article[];
  page: number;
  totalPages: number;
  totalItems: number;
}

export interface ArticleLink {
  label: string;
  href: string;
}

export interface ArticleInternalLinks {
  products?: ArticleLink[];
  collections?: ArticleLink[];
  guides?: ArticleLink[];
  posts?: ArticleLink[];
}

export interface ArticleHeadingBlock {
  type: 'heading';
  level: 2 | 3;
  id: string;
  text: string;
}

export interface ArticleParagraphBlock {
  type: 'paragraph';
  text: string;
}

export interface ArticleListBlock {
  type: 'list';
  ordered?: boolean;
  items: string[];
}

export interface ArticleTableBlock {
  type: 'table';
  caption?: string;
  headers: string[];
  rows: string[][];
}

export interface ArticleImageBlock {
  type: 'image';
  src: ImageMetadata;
  alt: string;
  caption?: string;
}

export interface ArticleQuoteBlock {
  type: 'quote';
  text: string;
  cite?: string;
}

export interface ArticleComparisonColumn {
  title: string;
  items: string[];
}

export interface ArticleComparisonBlock {
  type: 'comparison';
  heading?: string;
  columns: ArticleComparisonColumn[];
}

export interface ArticleProductsBlock {
  type: 'products';
  heading?: string;
  productSlugs: string[];
  descriptions?: Record<string, string>;
}

export interface ArticleCtaBlock {
  type: 'cta';
  text: string;
  href: string;
  label: string;
}

export type ArticleBlock =
  | ArticleHeadingBlock
  | ArticleParagraphBlock
  | ArticleListBlock
  | ArticleTableBlock
  | ArticleImageBlock
  | ArticleQuoteBlock
  | ArticleComparisonBlock
  | ArticleProductsBlock
  | ArticleCtaBlock;

export interface ArticleTocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface ArticlePageData {
  article: Article;
  path: string;
  metaTitle: string;
  metaDescription: string;
  summary: string;
  authorSlug: string;
  datePublished: string;
  dateModified: string;
  blocks: ArticleBlock[];
  recommendations?: ArticleProductsBlock;
  links: ArticleInternalLinks;
  relatedSlugs: string[];
  relatedOtherSlugs: string[];
  faqs?: FaqItem[];
}
