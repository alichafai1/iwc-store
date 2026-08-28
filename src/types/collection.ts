import type { FaqItem } from './faq';

export interface Collection {
  slug: string;
  name: string;
}

export interface CollectionPopularModel {
  name: string;
  slug: string;
  href: string;
}

export interface CollectionContextualLink {
  name: string;
  slug: string;
  href: string;
  label: string;
  context: string | null;
}

export interface CollectionComparisonItem {
  name: string;
  slug: string;
  href: string;
  body: string | null;
}

export interface CollectionInternalLink {
  label: string;
  href: string;
}

export interface CollectionPageData {
  collection: Collection;
  heading: string;
  path: string;
  intro: string | null;
  metaTitle: string;
  metaDescription: string;
  image: string | null;
  imageAlt: string;
  overviewParagraphs: string[];
  historyParagraphs: string[];
  modelsGuideHeading: string | null;
  modelsGuideParagraphs: string[];
  buyingGuideParagraphs: string[];
  comparisonParagraphs: string[];
  comparisonItems: CollectionComparisonItem[];
  features: string[];
  faqs: FaqItem[];
  faqHeading: string | null;
  whyChooseHeading: string | null;
  whyChooseParagraphs: string[];
  relatedIntro: string | null;
  relatedLinks: CollectionContextualLink[];
  popularModels: CollectionPopularModel[];
  internalLinks: CollectionInternalLink[];
  otherCollections: Collection[];
}
