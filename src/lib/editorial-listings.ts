import type { Article, EditorialKind } from '../types/article';

type ListingFrontmatter = {
  slug?: string;
  title?: string;
  description?: string;
  category?: string;
  image?: string;
  imageAlt?: string;
  date?: string;
  author?: string;
  isPillar?: boolean;
};

function parseListingFrontmatter(raw: string): ListingFrontmatter | null {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return null;
  }

  const data: ListingFrontmatter = {};

  for (const line of match[1].split('\n')) {
    const pair = line.match(/^([A-Za-z][A-Za-z0-9]*)\s*:\s*(.*)$/);
    if (!pair) {
      continue;
    }

    const key = pair[1];
    let value = pair[2].trim();
    if (!value) {
      continue;
    }

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key === 'isPillar') {
      data.isPillar = value === 'true';
      continue;
    }

    if (
      key === 'slug' ||
      key === 'title' ||
      key === 'description' ||
      key === 'category' ||
      key === 'image' ||
      key === 'imageAlt' ||
      key === 'date' ||
      key === 'author'
    ) {
      data[key] = value;
    }
  }

  return data;
}

function articlesFromRaw(kind: EditorialKind, modules: Record<string, string>): Article[] {
  const folder = kind === 'blog' ? 'blog' : 'guides';

  return Object.entries(modules)
    .map(([path, raw]) => {
      const data = parseListingFrontmatter(raw);
      const fallbackSlug = path.split('/').pop()?.replace(/\.(md|mdx)$/, '') ?? '';
      const slug = data?.slug || fallbackSlug;
      if (!data?.title || !data.description || !data.image || !data.imageAlt || !slug) {
        return null;
      }

      const article: Article = {
        slug,
        title: data.title,
        excerpt: data.description,
        category: data.category || 'Guides',
        href: `/${folder}/${slug}/`,
        image: data.image,
        imageAlt: data.imageAlt,
        kind,
        author: data.author,
        publishedAt: data.date,
        featured: Boolean(data.isPillar),
      };

      return article;
    })
    .filter((article): article is Article => Boolean(article))
    .sort((left, right) => (right.publishedAt ?? '').localeCompare(left.publishedAt ?? ''));
}

const guideModules = import.meta.glob('../content/guides/*.{md,mdx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const blogModules = import.meta.glob('../content/blog/*.{md,mdx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export function listPublishedGuides(): Article[] {
  return articlesFromRaw('guide', guideModules);
}

export function listPublishedPosts(): Article[] {
  return articlesFromRaw('blog', blogModules);
}

export function listHomepageArticles(limit = 3): Article[] {
  return [...listPublishedGuides(), ...listPublishedPosts()].slice(0, limit);
}
