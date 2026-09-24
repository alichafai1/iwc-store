import type { EditorialKind, EditorialPageContent } from '../types/article';

export const editorialPages: Record<EditorialKind, EditorialPageContent> = {
  blog: {
    kind: 'blog',
    title: 'Blog',
    intro: 'Notes on IWC replica collections, movements, and how we review watches before they go into the catalog.',
    metaTitle: 'Blog',
    metaDescription:
      'Editorial notes on replica IWC watches, collections, and quality. New posts appear here as they are published.',
    note: '',
    linkLabel: 'Read More',
    showDate: true,
    basePath: '/blog',
  },
  guide: {
    kind: 'guide',
    title: 'Guides',
    intro: 'Guides for choosing an IWC replica collection, comparing grades, and checking a watch before you buy.',
    metaTitle: 'Guides',
    metaDescription:
      'Guides for replica IWC watches: collections, superclones, and how to review quality. New guides appear here as they are published.',
    note: '',
    linkLabel: 'Read Guide',
    showDate: false,
    basePath: '/guides',
  },
};
