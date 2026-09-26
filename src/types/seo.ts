export type OpenGraphType = 'website' | 'article' | 'product';

export type TwitterCard = 'summary' | 'summary_large_image';

export interface ImagePreload {
  href?: string;
  imagesrcset?: string;
  imagesizes?: string;
  type?: string;
  fetchpriority?: 'high' | 'low' | 'auto';
}

export interface SeoInput {
  title: string;
  description: string;
  canonicalPath?: string;
  robots?: string;
  noindex?: boolean;
  ogType?: OpenGraphType;
  ogImage?: string;
  twitterCard?: TwitterCard;
  /** Optional early image discovery (e.g. product LCP). Max one recommended. */
  imagePreloads?: ImagePreload[];
}

export type JsonLdNode = Record<string, unknown>;
