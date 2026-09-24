import editorialTeam from '../assets/images/authors/editorial-team.webp';
import type { Author } from '../types/author';

export const authors: Author[] = [
  {
    slug: 'editorial-team',
    name: 'Editorial Team',
    role: 'Editors',
    bio: 'The IWC-Replica.to Editorial Team has spent years reviewing replica watches, comparing movements, testing materials, and photographing QC samples before publication. Every guide is based on hands-on inspection, not manufacturer claims. We independently verify weight, finish, and movement accuracy for every model we cover.',
    image: editorialTeam,
    imageAlt: 'IWC-Replica.to editorial team',
  },
];

export function getAuthor(slug: string): Author | undefined {
  return authors.find((author) => author.slug === slug);
}

export function getAuthorByName(name: string): Author | undefined {
  const needle = name.trim().toLowerCase();
  return authors.find(
    (author) => author.name.toLowerCase() === needle || author.slug.toLowerCase() === needle,
  );
}

export function getAuthors(): Author[] {
  return [...authors];
}
