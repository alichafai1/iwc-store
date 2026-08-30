import { collectionPath, merchandisingCollections, collections } from './collections';
import type { FaqItem } from '../types/faq';

/**
 * Keyword → collection → placement.
 * Primary source: /Users/alichafai/Downloads/IWC Keywords/*.xlsx
 * (forum.iwc, pyluxury, replicahauses, superclonewatch, susanreviews, twatchclone).
 * Competitor URLs ignored. fake / knockoff / imitation stay in FAQ only.
 */
export const collectionKeywordMap = {
  hub: {
    usedIn: 'hero introduction',
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
  'da-vinci': {
    usedIn: 'Da Vinci section',
    keywords: ['iwc da vinci replica', 'iwc davinci perpetual', 'iwc perpetual calendar replica', 'iwc minute repeater replica'],
  },
  ingenieur: {
    usedIn: 'Ingenieur section',
    keywords: ['iwc ingenieur replica'],
  },
  'mark-series': {
    usedIn: 'Mark Series section',
    keywords: ['iwc mark replica', 'iwc mark xv replica', 'iwc mark xviii replica'],
  },
  pilots: {
    usedIn: 'Pilots section',
    keywords: ['iwc pilot replica', 'iwc pilot chronograph replica', 'replica iwc pilot watch', 'iwc le petit prince replica'],
  },
  portofino: {
    usedIn: 'Portofino section',
    keywords: ['iwc portofino replica', 'vanilla sky iwc watch'],
  },
  portuguese: {
    usedIn: 'Portuguese section',
    keywords: [
      'portugieser watch',
      'iwc portugieser replica',
      'iwc portuguese replica',
      'iwc portugieser chronograph replica',
      'iwc portuguese sidérale scafusia',
    ],
  },
  spitfire: {
    usedIn: 'Spitfire section',
    keywords: ['iwc spitfire replica'],
  },
  'big-pilot': {
    usedIn: 'Big Pilot section',
    keywords: ['iwc big pilot replica', 'iwc big pilot replicas', 'iwc replica big pilot', 'big pilot replica'],
  },
  'top-gun': {
    usedIn: 'Top Gun section',
    keywords: [
      'iwc replica top gun',
      'iwc top gun replica',
      'iwc replica top gun watch',
      'replica iwc top gun watch',
      'top gun iwc replica',
      'iwc top gun clone',
      'iwc big pilot top gun replica',
      'iwc pilot top gun replica',
    ],
  },
  aquatimer: {
    usedIn: 'Aquatimer section',
    keywords: ['iwc aquatimer replica', 'iwc aquatimer 2000 replica'],
  },
  'best-sellers': {
    usedIn: 'Best Sellers section',
    keywords: ['best iwc replica', 'replica iwc watches', '1:1 watches'],
  },
  'new-arrivals': {
    usedIn: 'New Arrivals section',
    keywords: ['iwc watch replicas', 'iwc copy watches'],
  },
  faqOnly: {
    usedIn: 'FAQ answers only',
    keywords: [
      'iwc imitation',
      'iwc knockoff',
      'iwc watch knockoff',
      'iwc knockoff watches',
      'fake iwc',
      'fake iwc watches',
      'iwc watch fake',
      'fake iwc watch',
      'iwc superclone watch',
      'iwc super clone',
      'iwc superclone',
      'iwc big pilot fake',
      'fake iwc big pilot',
      'fake iwc portuguese',
      'iwc portugieser fake',
      'fake iwc top gun',
      'iwc top gun fake',
      'iwc aquatimer fake',
      'iwc box',
    ],
  },
} as const;

export interface CollectionHubCopy {
  heading: string;
  aboutHeading: string;
  paragraphs: string[];
  viewAllLabel: string;
}

export const collectionsHub = {
  heading: 'IWC Watch Collections',
  path: '/collections/',
  metaTitle: 'IWC Watch Collections',
  metaDescription:
    'Shop replica IWC watches by collection. Browse IWC replica, IWC replica watch, and 1:1 watches across Pilot, Portugieser, Portofino, Ingenieur, Da Vinci, Big Pilot, and Aquatimer.',
  intro:
    'This catalog sells replica IWC watches, grouped by the collections people already search: Pilot, Big Pilot, Portugieser, Portofino, Aquatimer, Ingenieur, and Da Vinci, plus Mark Series, Spitfire, Top Gun, Best Sellers, and New Arrivals. An IWC replica or replica IWC watch on this site is a published listing with photos and a Top 1:1 Clone price when that grade is set—not a genuine IWC Schaffhausen boutique watch. The same catalog answers searches for an IWC replica watch, replica watch IWC, IWC watch replicas, IWC watches replica, IWC copy watches, IWC clone watches, IWC first copy, IWC lookalike, IWC premium, or replika IWC. Open one collection at a time and read the specs before you compare 1:1 watches across families.',
  shopHeading: 'Shop by Collection',
} as const;

const fallbackCopy = (name: string): CollectionHubCopy => ({
  heading: `${name} Collection`,
  aboutHeading: `About the ${name} collection`,
  paragraphs: [
    `Open the ${name} collection for published replica IWC watches assigned to this line. Product pages carry the listed title, images, and Top 1:1 Clone price when that grade is set.`,
  ],
  viewAllLabel: `View all ${name}`,
});

const collectionCopy: Record<string, CollectionHubCopy> = {
  'da-vinci': {
    heading: 'Da Vinci Collection',
    aboutHeading: 'IWC Da Vinci replica calendars and complications',
    paragraphs: [
      'Da Vinci is the classic complication group in this store. An IWC Da Vinci replica follows that salon case and calendar dial—moon phase, day-date windows, and a quieter profile than a cockpit Pilot. Shoppers looking for an IWC Da Vinci perpetual or an IWC perpetual calendar replica start here when those titles are published.',
      'An IWC minute repeater replica belongs with Da Vinci only when the product name and spec table actually list that complication. Read the calendar layout on the page rather than matching a silver dial from another family. These listings document the replica reference; they are not authorized IWC perpetual pieces.',
      'Open every published calendar watch in the [Da Vinci collection](/collections/da-vinci/).',
    ],
    viewAllLabel: 'View all Da Vinci',
  },
  ingenieur: {
    heading: 'Ingenieur Collection',
    aboutHeading: 'IWC Ingenieur replica sport watches',
    paragraphs: [
      'Ingenieur is the integrated-bracelet sport line. An IWC Ingenieur replica is the listing to open for a taut bezel, a steel bracelet that sits close to the wrist, and a daily-wear case that is not a dive Aquatimer and not a thin Portofino.',
      'Use the spec table for diameter and thickness. The collection name describes the design language—the published grade and movement sit on the product page, not in the heading. If you want bracelet sport rather than a leather Pilot strap, this is the grid.',
      'See the full published range in the [Ingenieur collection](/collections/ingenieur/).',
    ],
    viewAllLabel: 'View all Ingenieur',
  },
  'mark-series': {
    heading: 'Mark Series Collection',
    aboutHeading: 'IWC Mark replica aviation watches',
    paragraphs: [
      'Mark Series is the more compact cockpit line. An IWC Mark replica, including IWC Mark XV replica and IWC Mark XVIII replica searches, points to these aviation cases: a tool dial, a smaller diameter than Big Pilot, and a leather or textile strap on most published pages.',
      'Mark generations still differ in bezel and lume. Confirm millimetres on the listing before you treat every Mark as office-light. This collection is not Top Gun ceramic and not a Portugieser dress watch.',
      'Browse every published Mark in the [Mark Series collection](/collections/mark-series/).',
    ],
    viewAllLabel: 'View all Mark Series',
  },
  pilots: {
    heading: 'Pilots Collection',
    aboutHeading: 'IWC Pilot replica and aviation watches',
    paragraphs: [
      'Pilots is the broad aviation collection. An IWC Pilot replica or replica IWC Pilot watch covers cockpit three-hand models and the IWC Pilot Chronograph replica when that complication is on the title. An IWC Le Petit Prince replica search belongs here when a published dial uses that theme.',
      'This hub is the place to compare aviation pieces before you lock a case size. Oversized three-hand watches live in Big Pilot; ceramic stealth finishes live in Top Gun. Every Pilot listing should still show diameter, movement, and the Top 1:1 Clone price when that grade is set.',
      'Shop the published aviation grid in the [Pilots collection](/collections/pilots/).',
    ],
    viewAllLabel: 'View all Pilots',
  },
  portofino: {
    heading: 'Portofino Collection',
    aboutHeading: 'IWC Portofino replica dress watches',
    paragraphs: [
      'Portofino is the slimmer dress line. An IWC Portofino replica is the evening watch: a thinner case, a leather strap, and a quiet dial rather than a rotating dive bezel. The Vanilla Sky IWC watch look that people remember from film stills is this Portofino profile.',
      'If you want a wide open dial instead of a slim dress case, go to Portuguese. Portofino listings should name thickness and movement—do not assume every dress replica is automatic.',
      'See every published dress piece in the [Portofino collection](/collections/portofino/).',
    ],
    viewAllLabel: 'View all Portofino',
  },
  portuguese: {
    heading: 'Portuguese Collection',
    aboutHeading: 'Portugieser watch and IWC Portuguese replica models',
    paragraphs: [
      'Portuguese is the store collection for the Portugieser watch look: a wide, open dial, often a leather strap, and a dress-sport case larger than Portofino. Shop an IWC Portugieser replica or an IWC Portuguese replica when you want that readable layout rather than a cockpit Pilot.',
      'An IWC Portugieser Chronograph replica sits here when the published title includes the chronograph. Collectors also search IWC Portuguese Sidérale Scafusia; only a listing that uses that name represents it. Read the spec rows for the complication—do not match on a champagne dial alone.',
      'Open the full published line in the [Portuguese collection](/collections/portuguese/).',
    ],
    viewAllLabel: 'View all Portuguese',
  },
  spitfire: {
    heading: 'Spitfire Collection',
    aboutHeading: 'IWC Spitfire replica aviation watches',
    paragraphs: [
      'Spitfire stays in the aviation family with a warmer historic-aircraft character than a stark Mark. An IWC Spitfire replica is the listing for that naming—often a chronograph or three-hand Pilot with sunburst or bronze-leaning finishing when the page shows it.',
      'It is not an Ingenieur bracelet sport watch and not an Aquatimer dive layout. Compare case height with Mark Series if you want a smaller daily Pilot, and compare with Big Pilot if you need the oversized cockpit case.',
      'View every published Spitfire in the [Spitfire collection](/collections/spitfire/).',
    ],
    viewAllLabel: 'View all Spitfire',
  },
  'big-pilot': {
    heading: 'Big Pilot Collection',
    aboutHeading: 'IWC Big Pilot replica oversized aviation watches',
    paragraphs: [
      'Big Pilot is the oversized cockpit three-hand. An IWC Big Pilot replica—also searched as IWC replica Big Pilot, IWC Big Pilot replicas, or Big Pilot replica—means the large case, diamond-shaped crown, and aviation dial that define the line.',
      'Do not treat this as a smaller Mark. Confirm the listed diameter before you assume it will sit under a cuff. Ceramic or stealth finishes that people file as Top Gun sit in that collection; this grid is the classic Big Pilot replica watches assigned here.',
      'See every published oversized Pilot in the [Big Pilot collection](/collections/big-pilot/).',
    ],
    viewAllLabel: 'View all Big Pilot',
  },
  'top-gun': {
    heading: 'Top Gun Collection',
    aboutHeading: 'IWC Top Gun replica and clone aviation watches',
    paragraphs: [
      'Top Gun is the darker aviation line. An IWC Top Gun replica, IWC replica Top Gun, IWC replica Top Gun watch, replica IWC Top Gun watch, or Top Gun IWC replica search belongs here. An IWC Top Gun clone listing still needs the published case material on the product page.',
      'IWC Big Pilot Top Gun replica and IWC Pilot Top Gun replica are the phrases people use for a stealth cockpit finish rather than a steel Big Pilot. Compare case-side photos; the name is a shopping label, not a film-prop certificate.',
      'Browse the published stealth aviation pieces in the [Top Gun collection](/collections/top-gun/).',
    ],
    viewAllLabel: 'View all Top Gun',
  },
  aquatimer: {
    heading: 'Aquatimer Collection',
    aboutHeading: 'IWC Aquatimer replica dive watches',
    paragraphs: [
      'Aquatimer is the dive-watch family: rotating bezel, sport strap or bracelet, and a tool case. An IWC Aquatimer replica is the listing for that layout. An IWC Aquatimer 2000 replica search points to the thicker, higher-listed-resistance references when those titles are live.',
      'Water-resistance numbers on replica pages are listed values, not boutique ratings. Treat them as dry-wear guidance unless the spec is explicit. For a slimmer sport bracelet without a dive bezel, compare Ingenieur instead.',
      'Open every published dive watch in the [Aquatimer collection](/collections/aquatimer/).',
    ],
    viewAllLabel: 'View all Aquatimer',
  },
  'best-sellers': {
    heading: 'Best Sellers',
    aboutHeading: 'Best IWC replica watches across collections',
    paragraphs: [
      'Best Sellers is a short list of replica IWC watches already drawing attention—not a separate model family. Use it when you want the best IWC replica options without opening Pilot, Portugieser, and Portofino one by one.',
      'The same published watch can appear here and in its model collection. Still read the 1:1 watches grade, diameter, and photos on the product page before you treat a rank as a wrist fit.',
      'See the current ranked list in [Best Sellers](/collections/best-sellers/).',
    ],
    viewAllLabel: 'View all Best Sellers',
  },
  'new-arrivals': {
    heading: 'New Arrivals',
    aboutHeading: 'New IWC watch replicas and copy watches',
    paragraphs: [
      'New Arrivals groups recently published IWC watch replicas and IWC copy watches as they go live. It is a merchandising path through the same catalog, not extra SKUs.',
      'If you already know the design, jump from here into Pilots, Portuguese, or Portofino. If you are browsing, use this list then confirm size and movement on the product page.',
      'Review the latest published pieces in [New Arrivals](/collections/new-arrivals/).',
    ],
    viewAllLabel: 'View all New Arrivals',
  },
};

export function getCollectionHubCopy(slug: string, name: string): CollectionHubCopy {
  return collectionCopy[slug] ?? fallbackCopy(name);
}

export const collectionsHubFaqs: FaqItem[] = [
  {
    question: 'What are the most popular IWC watch collections?',
    answer:
      'The collections shoppers open first here are [Pilots](/collections/pilots/), [Portuguese](/collections/portuguese/), [Portofino](/collections/portofino/), [Ingenieur](/collections/ingenieur/), and [Best Sellers](/collections/best-sellers/). Popular means published demand on this catalog, not an official IWC ranking. Big Pilot and Top Gun sit beside Pilots when you already want a large or ceramic cockpit watch.',
  },
  {
    question: 'Are IWC replica watches available in different collections?',
    answer:
      'Yes. Replica IWC watches are filed by design language: Pilot families, Portuguese / Portugieser, Portofino dress watches, Ingenieur sport bracelets, Da Vinci calendars, Spitfire, Mark Series, Big Pilot, Top Gun, and Aquatimer. [Best Sellers](/collections/best-sellers/) and [New Arrivals](/collections/new-arrivals/) are extra lists of the same published pieces, not separate products.',
  },
  {
    question: 'What is the difference between IWC Pilot and Portugieser watches?',
    answer:
      'An [IWC Pilot replica](/collections/pilots/) follows the cockpit tool watch: bold numerals, a larger crown, and often a thicker case. A Portugieser watch—sold here in the [Portuguese](/collections/portuguese/) collection as an IWC Portugieser replica or IWC Portuguese replica—is a wide, open dress-sport dial, usually on leather. They share the IWC look only in the broad sense; wrist size and thickness are not interchangeable. Compare millimetre specs on both product pages.',
  },
  {
    question: 'Which IWC collection is best for everyday wear?',
    answer:
      'For everyday wear, [Ingenieur](/collections/ingenieur/) and smaller [Mark Series](/collections/mark-series/) pieces are the usual starting points: a bracelet sport watch or a more compact Pilot. [Portofino](/collections/portofino/) works if you want a slimmer dress case. Portuguese and Big Pilot run larger; check the listed diameter. IWC premium on this site means a complete listing, not genuine IWC.',
  },
  {
    question: 'What is an IWC Top Gun replica compared with a Big Pilot replica?',
    answer:
      'An [IWC Top Gun replica](/collections/top-gun/) is the darker, often ceramic aviation watch. An [IWC Big Pilot replica](/collections/big-pilot/) is the oversized classic cockpit three-hand. People search IWC Big Pilot Top Gun replica and IWC Pilot Top Gun replica when they want the stealth finish on a large Pilot case. Read the published material and size; the names are shopping labels, not factory certificates.',
  },
  {
    question: 'Are IWC knockoff, imitation, and fake IWC searches the same as replica collections?',
    answer:
      'Those phrases are how some people search. An IWC knockoff, IWC imitation, IWC watch knockoff, or fake IWC watch query is the same shopping intent as replica IWC watches on this site. We describe the goods as replicas with listed specs. A fake IWC Portuguese, IWC Portugieser fake, fake IWC Big Pilot, IWC Top Gun fake, or IWC Aquatimer fake search still has to match a published collection and product title. Superclone / IWC super clone / IWC superclone watch are also shopping labels; the published grade here is Top 1:1 Clone when that option is set.',
  },
  {
    question: 'Do IWC replica collections include a box or papers?',
    answer:
      'An IWC box or papers is included only when that product page says so. Collections do not add packaging by default. After-sales cards are store documents, not an IWC international warranty. If a gift box matters, confirm it on the listing before checkout.',
  },
  {
    question: 'What does IWC clone or 1:1 watches mean on this catalog?',
    answer:
      'IWC clone watches and 1:1 watches are catalog language for a closer case and dial match than a loosely inspired piece. They are not IWC factory grades. Open the product for the Top 1:1 Clone price when that grade is published, then confirm diameter, movement, and photos. The collection hub only shows watches that are published with an image and a collection assignment.',
  },
];

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
