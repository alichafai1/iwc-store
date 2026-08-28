export type OpenGraphType = 'website' | 'article' | 'product';

export type TwitterCard = 'summary' | 'summary_large_image';

export interface SeoInput {
  title: string;
  description: string;
  canonicalPath?: string;
  robots?: string;
  noindex?: boolean;
  ogType?: OpenGraphType;
  ogImage?: string;
  twitterCard?: TwitterCard;
}

export type JsonLdNode = Record<string, unknown>;
