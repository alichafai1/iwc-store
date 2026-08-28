import editorialTeam from '../assets/images/authors/editorial-team.svg';
import type { Author } from '../types/author';

export const authors: Author[] = [
  {
    slug: 'editorial-team',
    name: 'Editorial Team',
    role: 'Editors',
    bio: 'Demo author bio. This profile is placeholder copy for the article template and the future author pages.',
    image: editorialTeam,
    imageAlt: 'Editorial Team placeholder portrait',
  },
  {
    slug: 'collection-editor',
    name: 'Collection Editor',
    role: 'Guides',
    bio: 'Demo author bio. Replace this short note when author profiles are connected to the publishing system.',
    image: editorialTeam,
    imageAlt: 'Collection Editor placeholder portrait',
  },
];

export function getAuthor(slug: string): Author | undefined {
  return authors.find((author) => author.slug === slug);
}

export function getAuthors(): Author[] {
  return [...authors];
}
