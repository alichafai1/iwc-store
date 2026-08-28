import caring from '../assets/images/editorial/caring-for-a-timepiece.svg';
import choosing from '../assets/images/editorial/choosing-a-collection.svg';
import finishing from '../assets/images/editorial/notes-on-finishing.svg';
import { demoBlogPosts, demoGuides } from './editorial';
import type { Article, ArticleBlock, ArticlePageData, EditorialKind } from '../types/article';

function articlePath(article: Article): string {
  return article.kind === 'blog' ? `/blog/${article.slug}/` : `/guides/${article.slug}/`;
}

function defaultBlocks(article: Article): ArticleBlock[] {
  const kindLabel = article.kind === 'blog' ? 'article' : 'guide';

  return [
    {
      type: 'heading',
      level: 2,
      id: 'overview',
      text: 'Overview',
    },
    {
      type: 'paragraph',
      text: `Demo ${kindLabel} copy for ${article.title}. This page exists so the article template, headings, and internal links can be reviewed before real content is published.`,
    },
    {
      type: 'heading',
      level: 3,
      id: 'what-this-covers',
      text: 'What this covers',
    },
    {
      type: 'list',
      items: [
        'Placeholder points for layout review',
        'Replace each line with a verified note',
        'Keep the finished version factual and specific',
      ],
    },
    {
      type: 'quote',
      text: 'Demo quote for spacing only. This is not a published statement.',
      cite: 'Editorial note',
    },
    {
      type: 'heading',
      level: 2,
      id: 'reading-next',
      text: 'Reading next',
    },
    {
      type: 'paragraph',
      text: `Continue with the [collections](/collections/) or return to the [${article.kind === 'blog' ? 'blog' : 'guides'}](${article.kind === 'blog' ? '/blog/' : '/guides/'}) index.`,
    },
    {
      type: 'cta',
      text: 'This call-to-action is placeholder copy for the article template.',
      href: '/collections/',
      label: 'View collections',
    },
  ];
}

function defaultPage(article: Article, extras: Partial<ArticlePageData> = {}): ArticlePageData {
  const published = article.publishedAt ?? '2026-01-12';

  return {
    article,
    path: articlePath(article),
    metaTitle: article.title,
    metaDescription: article.excerpt,
    summary: article.excerpt,
    authorSlug: article.kind === 'guide' ? 'collection-editor' : 'editorial-team',
    datePublished: published,
    dateModified: published,
    blocks: defaultBlocks(article),
    links: {
      collections: [{ label: 'View all collections', href: '/collections/' }],
      products: [{ label: 'Da Vinci Chronograph', href: '/products/da-vinci-chronograph/' }],
      guides: [{ label: 'How to choose a collection', href: '/guides/how-to-choose-a-collection/' }],
      posts: [{ label: 'Notes on finishing', href: '/blog/notes-on-finishing/' }],
    },
    relatedSlugs: [],
    relatedOtherSlugs: [],
    ...extras,
  };
}

const finishingPage = defaultPage(demoBlogPosts[0], {
  metaTitle: 'Notes on finishing',
  metaDescription: 'Demo article on case work, dials, and bracelet construction. Placeholder blog post for layout and SEO structure.',
  summary: 'A short demo introduction to finishing. Use this page to review the article template, table of contents, and product recommendations.',
  datePublished: '2026-03-12',
  dateModified: '2026-04-02',
  relatedSlugs: ['reading-a-dial', 'strap-and-clasp-notes'],
  relatedOtherSlugs: ['how-to-choose-a-collection', 'caring-for-a-timepiece'],
  recommendations: {
    type: 'products',
    heading: 'Pieces to review',
    productSlugs: ['da-vinci-chronograph', 'portofino-automatic'],
    descriptions: {
      'da-vinci-chronograph': 'Demo recommendation. Replace this note with a short, factual reason to consider the piece.',
      'portofino-automatic': 'Demo recommendation. Use this line for a second product when a comparison is useful.',
    },
  },
  faqs: [
    {
      question: 'Is this a published article?',
      answer: 'No. This is demo copy for the article template and structured data. Replace it when the publishing system is connected.',
    },
    {
      question: 'Where can I see related collections?',
      answer: 'Use the internal links below to open the Da Vinci collection and other placeholder listings.',
    },
  ],
  links: {
    products: [
      { label: 'Da Vinci Chronograph', href: '/products/da-vinci-chronograph/' },
      { label: 'Portofino Automatic', href: '/products/portofino-automatic/' },
    ],
    collections: [
      { label: 'Da Vinci collection', href: '/collections/da-vinci/' },
      { label: 'Portofino collection', href: '/collections/portofino/' },
    ],
    guides: [
      { label: 'How to choose a collection', href: '/guides/how-to-choose-a-collection/' },
      { label: 'Caring for a timepiece', href: '/guides/caring-for-a-timepiece/' },
    ],
    posts: [
      { label: 'Reading a dial', href: '/blog/reading-a-dial/' },
      { label: 'Strap and clasp notes', href: '/blog/strap-and-clasp-notes/' },
    ],
  },
  blocks: [
    {
      type: 'heading',
      level: 2,
      id: 'what-finishing-means',
      text: 'What finishing means',
    },
    {
      type: 'paragraph',
      text: 'Demo paragraph. Finishing is the work you can see on a case, dial, and bracelet. This text is here so the article width, spacing, and [Da Vinci collection](/collections/da-vinci/) links can be reviewed.',
    },
    {
      type: 'paragraph',
      text: 'Keep the finished version specific. Do not leave promotional claims that cannot be verified.',
    },
    {
      type: 'heading',
      level: 3,
      id: 'case-work',
      text: 'Case work',
    },
    {
      type: 'list',
      items: [
        'Look at the brushing and polished edges',
        'Check how the lugs meet the strap or bracelet',
        'Compare the case back finishing with the front',
      ],
    },
    {
      type: 'heading',
      level: 3,
      id: 'dials',
      text: 'Dials',
    },
    {
      type: 'paragraph',
      text: 'Demo paragraph. Dial printing, indices, and hands should read clearly. See [Reading a dial](/blog/reading-a-dial/) for a related placeholder note.',
    },
    {
      type: 'image',
      src: finishing,
      alt: 'Demo inline image for finishing notes',
      caption: 'Demo caption. Replace this image when the article is published.',
    },
    {
      type: 'heading',
      level: 2,
      id: 'how-to-compare-finishing',
      text: 'How to compare finishing',
    },
    {
      type: 'table',
      caption: 'Demo comparison table for layout review',
      headers: ['Detail', 'What to check', 'Why it matters'],
      rows: [
        ['Case', 'Brushing and polish', 'Shows how the surfaces were prepared'],
        ['Dial', 'Print and indices', 'Affects how the watch is read'],
        ['Bracelet', 'Links and clasp', 'Changes comfort and daily wear'],
      ],
    },
    {
      type: 'comparison',
      heading: 'Two ways to review a piece',
      columns: [
        {
          title: 'On the wrist',
          items: ['Check the case size in person', 'See how the bracelet sits', 'Read the dial in normal light'],
        },
        {
          title: 'In photographs',
          items: ['Look at close finishing shots', 'Compare multiple angles', 'Use [collection pages](/collections/) for context'],
        },
      ],
    },
    {
      type: 'quote',
      text: 'Demo quote. Finishing should be described in plain language, not as a claim that cannot be checked.',
      cite: 'Editorial Team',
    },
    {
      type: 'heading',
      level: 2,
      id: 'recommended-pieces',
      text: 'Recommended pieces',
    },
    {
      type: 'paragraph',
      text: 'Recommended product cards appear after this article. Each one uses the existing product card and links to a real product page.',
    },
    {
      type: 'heading',
      level: 2,
      id: 'next-steps',
      text: 'Next steps',
    },
    {
      type: 'cta',
      text: 'If you are comparing collections, start with the choosing guide.',
      href: '/guides/how-to-choose-a-collection/',
      label: 'Read the choosing guide',
    },
  ],
});

const choosingPage = defaultPage(demoGuides[0], {
  metaTitle: 'How to choose a collection',
  metaDescription: 'Demo guide to matching a collection with how a watch will be worn. Placeholder guide for layout and SEO structure.',
  summary: 'A short demo introduction to choosing a collection. This guide is placeholder copy for the article template.',
  datePublished: '2026-03-04',
  dateModified: '2026-03-28',
  relatedSlugs: ['caring-for-a-timepiece', 'understanding-case-sizes'],
  relatedOtherSlugs: ['notes-on-finishing', 'how-a-collection-is-presented'],
  recommendations: {
    type: 'products',
    heading: 'Collections to open first',
    productSlugs: ['da-vinci-automatic', 'pilots-utc', 'portofino-automatic'],
    descriptions: {
      'da-vinci-automatic': 'Demo recommendation for a dress-leaning starting point.',
      'pilots-utc': 'Demo recommendation when travel and dual time are the priority.',
      'portofino-automatic': 'Demo recommendation for a simpler daily piece.',
    },
  },
  faqs: [
    {
      question: 'Should I start with a collection or a model?',
      answer: 'Start with how the watch will be worn, then open the matching collection page. This answer is placeholder copy.',
    },
    {
      question: 'Are these collection names final?',
      answer: 'The collection names and slugs on this site are the ones already in use. Do not invent new ones in this guide.',
    },
  ],
  links: {
    products: [
      { label: 'Da Vinci Automatic', href: '/products/da-vinci-automatic/' },
      { label: 'Pilot UTC', href: '/products/pilots-utc/' },
    ],
    collections: [
      { label: 'Da Vinci collection', href: '/collections/da-vinci/' },
      { label: 'Pilots collection', href: '/collections/pilots/' },
      { label: 'Portofino collection', href: '/collections/portofino/' },
    ],
    guides: [
      { label: 'Caring for a timepiece', href: '/guides/caring-for-a-timepiece/' },
      { label: 'Understanding case sizes', href: '/guides/understanding-case-sizes/' },
    ],
    posts: [
      { label: 'Notes on finishing', href: '/blog/notes-on-finishing/' },
      { label: 'How a collection is presented', href: '/blog/how-a-collection-is-presented/' },
    ],
  },
  blocks: [
    {
      type: 'heading',
      level: 2,
      id: 'start-with-how-it-will-be-worn',
      text: 'Start with how it will be worn',
    },
    {
      type: 'paragraph',
      text: 'Demo paragraph. Choose a collection from the way the watch will be used, not from a slogan. Open the [collections index](/collections/) after you know the setting.',
    },
    {
      type: 'heading',
      level: 3,
      id: 'daily-wear',
      text: 'Daily wear',
    },
    {
      type: 'list',
      items: [
        'A simpler dial is easier to read',
        'A comfortable strap or bracelet matters more than extra features',
        'See [Wearing a watch daily](/guides/wearing-a-watch-daily/) for a related placeholder guide',
      ],
    },
    {
      type: 'heading',
      level: 3,
      id: 'formal-use',
      text: 'Formal use',
    },
    {
      type: 'paragraph',
      text: 'Demo paragraph. A thinner case and a quieter dial are often easier in formal settings. The [Da Vinci collection](/collections/da-vinci/) is one place to start this review.',
    },
    {
      type: 'image',
      src: choosing,
      alt: 'Demo inline image for choosing a collection',
      caption: 'Demo caption. Replace this image when the guide is published.',
    },
    {
      type: 'heading',
      level: 2,
      id: 'comparing-collections',
      text: 'Comparing collections',
    },
    {
      type: 'table',
      caption: 'Demo collection comparison for layout review',
      headers: ['If you need', 'Open this collection', 'Then review'],
      rows: [
        ['A dress-leaning piece', 'Da Vinci', 'Da Vinci Automatic'],
        ['Travel and dual time', 'Pilots', 'Pilot UTC'],
        ['A simpler daily watch', 'Portofino', 'Portofino Automatic'],
      ],
    },
    {
      type: 'comparison',
      heading: 'Two starting questions',
      columns: [
        {
          title: 'Use',
          items: ['Daily wear or formal use', 'Travel or a single time zone', 'How often the watch will be worn'],
        },
        {
          title: 'Preference',
          items: ['Dial clarity', 'Case size, covered in [Understanding case sizes](/guides/understanding-case-sizes/)', 'Strap or bracelet'],
        },
      ],
    },
    {
      type: 'quote',
      text: 'Demo quote. A collection is easier to choose when the use case is written down first.',
      cite: 'Collection Editor',
    },
    {
      type: 'heading',
      level: 2,
      id: 'pieces-to-review',
      text: 'Pieces to review',
    },
    {
      type: 'paragraph',
      text: 'Recommended product cards appear after this guide. Each one links to an existing product page.',
    },
    {
      type: 'heading',
      level: 2,
      id: 'after-you-choose',
      text: 'After you choose',
    },
    {
      type: 'cta',
      text: 'When you have a collection in mind, read the finishing note before you compare individual pieces.',
      href: '/blog/notes-on-finishing/',
      label: 'Read notes on finishing',
    },
  ],
});

const pageOverrides: Partial<Record<`${EditorialKind}:${string}`, ArticlePageData>> = {
  'blog:notes-on-finishing': finishingPage,
  'guide:how-to-choose-a-collection': choosingPage,
};

function relatedDefaults(article: Article): Pick<ArticlePageData, 'relatedSlugs' | 'relatedOtherSlugs'> {
  const same = (article.kind === 'blog' ? demoBlogPosts : demoGuides)
    .filter((item) => item.slug !== article.slug)
    .slice(0, 2)
    .map((item) => item.slug);
  const other = (article.kind === 'blog' ? demoGuides : demoBlogPosts).slice(0, 2).map((item) => item.slug);

  return {
    relatedSlugs: same,
    relatedOtherSlugs: other,
  };
}

export function getArticlePage(kind: EditorialKind, slug: string): ArticlePageData | undefined {
  const article = (kind === 'blog' ? demoBlogPosts : demoGuides).find((item) => item.slug === slug);

  if (!article) {
    return undefined;
  }

  return pageOverrides[`${kind}:${slug}`] ?? defaultPage(article, relatedDefaults(article));
}

export function getArticlePages(kind?: EditorialKind): ArticlePageData[] {
  const articles = kind
    ? kind === 'blog'
      ? demoBlogPosts
      : demoGuides
    : [...demoBlogPosts, ...demoGuides];

  return articles
    .map((article) => getArticlePage(article.kind, article.slug))
    .filter((page): page is ArticlePageData => Boolean(page));
}

export { caring, choosing, finishing };
