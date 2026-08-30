import type { FaqItem } from '../types/faq';

/**
 * Keyword → section → usage.
 * Primary source: /Users/alichafai/Downloads/IWC Keywords/*.xlsx
 * fake / knockoff / imitation stay in FAQ only.
 */
export const shopKeywordMap = {
  general: {
    usedIn: 'hero, long-form, meta',
    keywords: [
      'replica iwc watches',
      'replica iwc watch',
      'iwc replica',
      'iwc replica watch',
      'replica iwc',
      'iwc watch replicas',
      'iwc watches replicas',
      'replica watch iwc',
      'iwc watches replica',
      'iwc copy watches',
      'iwc clone',
      'iwc clone watches',
      'iwc first copy',
      '1:1 watches',
      'iwc premium',
      'iwc lookalike',
      'replika iwc',
    ],
  },
  collections: {
    usedIn: 'explore cards + featured blocks',
    keywords: [
      'iwc pilot replica',
      'replica iwc pilot watch',
      'iwc pilot chronograph replica',
      'iwc le petit prince replica',
      'iwc big pilot replica',
      'iwc replica big pilot',
      'big pilot replica',
      'portugieser watch',
      'iwc portugieser replica',
      'iwc portuguese replica',
      'iwc portugieser chronograph replica',
      'iwc portofino replica',
      'vanilla sky iwc watch',
      'iwc aquatimer replica',
      'iwc aquatimer 2000 replica',
      'iwc ingenieur replica',
      'iwc da vinci replica',
      'iwc davinci perpetual',
      'iwc perpetual calendar replica',
    ],
  },
  models: {
    usedIn: 'featured blocks + long-form',
    keywords: [
      'iwc mark replica',
      'iwc mark xv replica',
      'iwc mark xviii replica',
      'iwc spitfire replica',
      'iwc top gun replica',
      'iwc replica top gun',
      'iwc portuguese sidérale scafusia',
      'iwc minute repeater replica',
    ],
  },
  buying: {
    usedIn: 'shop heading, filters intro, FAQ',
    keywords: ['best iwc replica', '1:1 watches', 'iwc box'],
  },
  faqOnly: {
    usedIn: 'FAQ answers only',
    keywords: [
      'iwc imitation',
      'iwc knockoff',
      'iwc watch knockoff',
      'fake iwc',
      'iwc super clone',
      'iwc superclone watch',
    ],
  },
} as const;

export const shopPage = {
  path: '/shop/',
  heading: 'Shop IWC Replica Watches',
  metaTitle: 'Shop IWC Replica Watches',
  metaDescription:
    'Shop replica IWC watches by collection. Browse IWC replica, IWC Pilot, Portugieser, Portofino, Aquatimer, Ingenieur, and Da Vinci listings with published prices.',
  intro:
    'This store sells replica IWC watches. Browse an IWC replica or replica IWC watch by collection—Pilot, Big Pilot, Portugieser, Portofino, Aquatimer, Ingenieur, and Da Vinci—then open a listing for the published 1:1 watches grade and price. Searches for IWC replica watch, replica watch IWC, IWC watch replicas, IWC copy watches, IWC clone watches, IWC first copy, IWC lookalike, IWC premium, or replika IWC all point to this catalog, not a genuine IWC Schaffhausen boutique.',
  exploreHeading: 'Explore IWC Collections',
  catalogHeading: 'All replica IWC watches',
  catalogIntro:
    'Filter by collection, price, or reference number to find the best IWC replica for the wrist you have in mind. Every card is a published listing with a product page.',
  discoverHeading: 'Discover Our IWC Replica Watch Collection',
} as const;

export const shopExploreTitles: Record<string, string> = {
  pilots: 'Pilot Watches',
  'big-pilot': 'Big Pilot Watches',
  portuguese: 'Portugieser Watches',
  portofino: 'Portofino Watches',
  aquatimer: 'Aquatimer Watches',
  ingenieur: 'Ingenieur Watches',
  'da-vinci': 'Da Vinci Watches',
  'mark-series': 'Mark Series Watches',
  spitfire: 'Spitfire Watches',
  'top-gun': 'Top Gun Watches',
  'best-sellers': 'Best Sellers',
  'new-arrivals': 'New Arrivals',
};

export const shopFeaturedBlocks = [
  {
    slug: 'pilots',
    heading: 'Explore IWC Pilot Watches',
    paragraphs: [
      'An IWC Pilot replica or replica IWC Pilot watch is the cockpit family: bold numerals, a tool crown, and often a chronograph. An IWC Pilot Chronograph replica and an IWC Le Petit Prince replica sit in this line when those titles are published.',
      'Start here if you want aviation first, then compare case size with Big Pilot or Mark Series on the product specs.',
    ],
  },
  {
    slug: 'big-pilot',
    heading: 'Explore IWC Big Pilot Watches',
    paragraphs: [
      'An IWC Big Pilot replica—also searched as IWC replica Big Pilot or Big Pilot replica—is the oversized three-hand cockpit watch. Confirm the listed diameter; it will not wear like a slimmer Portofino.',
    ],
  },
  {
    slug: 'portuguese',
    heading: 'Explore IWC Portugieser Watches',
    paragraphs: [
      'A Portugieser watch in this catalog is the Portuguese collection: an IWC Portugieser replica or IWC Portuguese replica with a wide, open dress-sport dial. An IWC Portugieser Chronograph replica belongs here when the title includes the chronograph. IWC Portuguese Sidérale Scafusia appears only if a listing uses that name.',
    ],
  },
  {
    slug: 'portofino',
    heading: 'Explore IWC Portofino Watches',
    paragraphs: [
      'An IWC Portofino replica is the slimmer dress watch. The Vanilla Sky IWC watch look is this Portofino profile—leather strap, thinner case, evening wear rather than a dive bezel.',
    ],
  },
  {
    slug: 'aquatimer',
    heading: 'Explore IWC Aquatimer Watches',
    paragraphs: [
      'An IWC Aquatimer replica is the dive layout: rotating bezel and a sport case. An IWC Aquatimer 2000 replica search is the thicker, higher-listed-resistance reference when that title is live. Listed water resistance is a catalog figure, not a boutique rating.',
    ],
  },
  {
    slug: 'ingenieur',
    heading: 'Explore IWC Ingenieur Watches',
    paragraphs: [
      'An IWC Ingenieur replica is the integrated-bracelet sport watch. Use it for daily wear when you want steel closer to the wrist than a thick Pilot strap, and compare thickness with Aquatimer if you also need a dive bezel.',
    ],
  },
  {
    slug: 'da-vinci',
    heading: 'Explore IWC Da Vinci Watches',
    paragraphs: [
      'An IWC Da Vinci replica is the calendar and complication line. IWC Da Vinci perpetual and IWC perpetual calendar replica searches start here. An IWC minute repeater replica belongs only when the product title lists that complication.',
    ],
  },
] as const;

export const shopDiscoverParagraphs = [
  'Replica IWC watches on this shop page are the same published catalog you open from a collection hub: an IWC replica with photos, a reference when the SKU is set, and a Top 1:1 Clone price when that grade is listed. IWC watches replica and IWC watches replicas searches are the same store—filter by Pilot, Portugieser, Portofino, Aquatimer, Ingenieur, or Da Vinci instead of scrolling an unnamed grid.',
  'Popular models follow how people search the files behind this page. Aviation shoppers look for an IWC Pilot replica, IWC Pilot Chronograph replica, IWC Big Pilot replica, IWC Mark replica (including Mark XV and Mark XVIII), IWC Spitfire replica, or IWC Top Gun replica. Dress and sport-dress shoppers look for a Portugieser watch, IWC Portugieser Chronograph replica, or IWC Portofino replica. Dive and bracelet sport sit in IWC Aquatimer replica and IWC Ingenieur replica. Calendar complications sit in IWC Da Vinci replica and IWC perpetual calendar replica.',
  'Styles differ by case, not by marketing grade. A cockpit Pilot will not wear like a Portugieser. A Big Pilot replica is larger than a Mark. An Ingenieur bracelet is not an Aquatimer bezel. Choose the collection that matches the reference you already have in mind, then read diameter, movement, and the listed price. An IWC box is included only when that product page says so.',
  'To choose the right collection, start with use: aviation, dress, dive, or bracelet sport. Then open the product. Best IWC replica is the listing that matches wrist size and the published specs—not a nickname such as IWC clone or IWC first copy on its own. Use the filters above to narrow collection, price, and reference, then follow the collection blocks if you want a shorter path into one family.',
];

export const shopFaqs: FaqItem[] = [
  {
    question: 'What are the most popular IWC replica watches?',
    answer:
      'The searches that show up most often in our keyword files are replica IWC watches, IWC replica, IWC Pilot replica, IWC Big Pilot replica, Portugieser watch, and IWC Portofino replica. On this shop, popularity means published listings people open—not an official IWC rank. Use [Best Sellers](/collections/best-sellers/) for a shorter cross-collection list.',
  },
  {
    question: 'Which IWC collection should I choose?',
    answer:
      'Choose by case language. [Pilot](/collections/pilots/) and [Big Pilot](/collections/big-pilot/) are aviation. [Portuguese](/collections/portuguese/) is the Portugieser dress-sport dial. [Portofino](/collections/portofino/) is slimmer dress. [Aquatimer](/collections/aquatimer/) is dive. [Ingenieur](/collections/ingenieur/) is bracelet sport. [Da Vinci](/collections/da-vinci/) is calendar complications. Then read the product specs.',
  },
  {
    question: 'What is the difference between IWC Pilot and Portugieser watches?',
    answer:
      'An [IWC Pilot replica](/collections/pilots/) is a cockpit tool watch. A Portugieser watch—an [IWC Portugieser replica](/collections/portuguese/) or IWC Portuguese replica—is a wide, open dress-sport dial, often on leather. They are not interchangeable on the wrist. Compare millimetres on both product pages.',
  },
  {
    question: 'Are IWC replica watches available in different models?',
    answer:
      'Yes. This shop lists published models across the collections above, including IWC Pilot Chronograph replica, IWC Le Petit Prince replica, IWC Mark XVIII replica, IWC Aquatimer 2000 replica, and IWC Portugieser Chronograph replica when those titles are live. Filter by collection or reference to find a specific IWC replica watch.',
  },
  {
    question: 'Are IWC knockoff, imitation, and fake IWC the same as this shop?',
    answer:
      'Those are search phrases. An IWC knockoff, IWC imitation, IWC watch knockoff, or fake IWC query is the same shopping intent as replica IWC watches here. We describe the goods as replicas with listed specs. IWC super clone and IWC superclone watch are also shopping labels; the published grade is Top 1:1 Clone when that option is set.',
  },
  {
    question: 'Does every IWC replica include a box?',
    answer:
      'An IWC box is included only when the product page says so. The shop grid does not add packaging by default. Confirm accessories on the listing if the box matters for a gift.',
  },
];
