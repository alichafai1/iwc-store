import { demoBlogPosts, demoGuides } from './editorial';
import type { Article } from '../types/article';

const bySlug = (items: Article[], slug: string): Article => {
  const article = items.find((item) => item.slug === slug);

  if (!article) {
    throw new Error(`Missing homepage article: ${slug}`);
  }

  return article;
};

export const placeholderArticles: Article[] = [
  bySlug(demoGuides, 'how-to-choose-a-collection'),
  bySlug(demoBlogPosts, 'notes-on-finishing'),
  bySlug(demoGuides, 'caring-for-a-timepiece'),
];
