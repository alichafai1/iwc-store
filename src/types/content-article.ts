export type ContentCollectionName = 'guides' | 'blog';

export interface ContentFaqItem {
  question: string;
  answer: string;
}

export interface ContentHeading {
  depth: number;
  slug: string;
  text: string;
}

export interface ContentBreadcrumbItem {
  name: string;
  url: string;
}

export interface InternalLinkTarget {
  to?: string;
  href?: string;
  anchor: string;
}

export interface InternalLinkNode {
  type: 'pillar' | 'cluster';
  pillar?: string;
  links: InternalLinkTarget[];
}

export type InternalLinksMap = Record<string, InternalLinkNode>;

export interface RelatedArticleCard {
  slug: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  href: string;
}
