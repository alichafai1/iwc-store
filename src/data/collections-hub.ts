import { collectionPath, merchandisingCollections, collections } from './collections';

export const collectionsHub = {
  heading: 'Watch Collections',
  path: '/collections/',
  metaTitle: 'Watch Collections',
  metaDescription:
    'Browse Da Vinci, Ingenieur, Pilots, Portofino, Portuguese, Spitfire, Mark Series, and Aquatimer, plus Best Sellers and New Arrivals. Open any collection for published watches and prices.',
  intro:
    'This is the catalog by collection. Start with a design language you already know, or use Best Sellers and New Arrivals when you want a shorter list drawn from across the line.',
  shopHeading: 'Shop by collection',
  merchHeading: 'Best Sellers and New Arrivals',
  merchIntro:
    'These two lists are merchandising views, not extra product records. The same published watch can appear here and in its model collection.',
  seo: {
    heading: 'How the collections are organized',
    paragraphs: [
      'Each model collection groups watches that share a case language and typical use. Open a collection page for product images, the 5A Clone price, any compare-at price, and reviews attached to that watch.',
      'Best Sellers and New Arrivals sit beside the model collections so you can compare pieces without browsing every line first. When you know the design you want, go straight to that collection.',
    ],
    linksHeading: 'Shop a collection',
  },
} as const;

export const collectionsHubLinks = [
  ...collections.map((collection) => ({
    href: collectionPath(collection.slug),
    label: `${collection.name} watches`,
  })),
  ...merchandisingCollections.map((collection) => ({
    href: collectionPath(collection.slug),
    label: collection.slug === 'new-arrivals' ? 'New Arrival watches' : collection.name,
  })),
];
