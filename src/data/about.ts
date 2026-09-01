import type { FaqItem } from '../types/faq';
import type { FeatureIconName } from './feature-icons';
import { collectionPath, collections } from './collections';

export const aboutPage = {
  path: '/about/',
  metaTitle: 'About IWC-Replica.com',
  metaDescription:
    'IWC-Replica.com is a catalog of replica IWC watches—Pilot, Portugieser, Portofino, Ingenieur, Da Vinci, Big Pilot, Top Gun, and Aquatimer—published as Top 1:1 Clone listings with QC photos before dispatch.',
  eyebrow: 'About',
  heading: 'IWC-Replica.com',
  lead: 'A catalog of replica IWC watches grouped by the collections people already shop: Pilot, Portugieser, Portofino, Ingenieur, and the rest of the published families. Each IWC replica watch on this site is a documented listing—photos, specs, and a Top 1:1 Clone grade when that option is set—not a genuine IWC Schaffhausen boutique piece.',
} as const;

export const aboutStory = {
  heading: 'Who we are',
  paragraphs: [
    'IWC-Replica.com exists for shoppers who want an IWC replica with a named collection, a readable spec table, and a listed price. Replica IWC watches here follow the look of known references—case shape, dial layout, strap or bracelet—so you can compare a replica IWC against another listing instead of guessing from an unnamed photo.',
    'This is an independent catalog. An IWC replica on these pages is not an official IWC product, not authorized-boutique stock, and not covered by an IWC international warranty. IWC premium on this site means the page is complete: title, images, movement, and grade. After-sales cards are store documents.',
    'The same catalog answers searches for an IWC replica watch, a replica watch IWC, or IWC watch replicas. Open one collection at a time, then read diameter, thickness, and movement on the product page before you order. If you already know the line, start in [Collections](/collections/). If you want a ranked shortlist, use [Best Sellers](/collections/best-sellers/) or [New Arrivals](/collections/new-arrivals/).',
  ],
} as const;

export const aboutProcess = {
  heading: 'How an order is handled',
  intro:
    'Serious replica catalogs earn trust in the steps between checkout and dispatch. The promises on this site are the ones already in the header: QC photos before the watch leaves, tax-free worldwide shipping, and a one-year movement warranty.',
  steps: [
    {
      number: '01',
      title: 'Choose a published listing',
      text: 'Open a replica IWC watch whose title, photos, and spec table match the reference you want. The collection name is a design language—Pilot, Portuguese, Portofino—not a substitute for millimetres and movement.',
    },
    {
      number: '02',
      title: 'Confirm on checkout or WhatsApp',
      text: 'Place the order through checkout, or write on WhatsApp 24/7 if you need the grade, size, or availability confirmed first. Support is there before you pay and after the watch arrives.',
    },
    {
      number: '03',
      title: 'Review QC photos before dispatch',
      text: 'You receive QC photos of the actual watch before it ships. Approve the piece you were shown. If something on the dial, case, or bracelet is not right, say so before dispatch—not after the parcel is in transit.',
    },
    {
      number: '04',
      title: 'Tracked shipping and a movement warranty',
      text: 'Orders ship tax-free worldwide, with delivery times that vary by destination. Movement cover runs one year from delivery. Return requests are accepted within 14 days of delivery.',
    },
  ],
} as const;

export const aboutCollections = {
  heading: 'Collections in this catalog',
  intro:
    'Replica IWC watches are filed by family so you can stay inside one design language. Aviation, dress, sport, and dive lines sit beside each other; Best Sellers and New Arrivals are extra lists of the same published pieces.',
} as const;

export const aboutCollectionLines: Record<string, string> = {
  pilots:
    'IWC Pilot replica and replica IWC Pilot watch listings—three-hand cockpit models and the Pilot Chronograph when that complication is on the title.',
  portuguese:
    'The Portugieser watch look: an IWC Portugieser replica or IWC Portuguese replica with a wide, open dial rather than a thick Pilot case.',
  portofino:
    'IWC Portofino replica dress watches—the slimmer evening profile, including the Vanilla Sky IWC watch look people remember from film stills.',
  ingenieur: 'IWC Ingenieur replica sport watches on an integrated bracelet: taut bezel, daily-wear steel, not a dive Aquatimer.',
  'da-vinci':
    'IWC Da Vinci replica calendars and complications—moon phase, perpetual layouts, and quieter salon cases when those titles are published.',
  spitfire: 'IWC Spitfire replica aviation watches with a warmer historic-aircraft character than a stark Mark.',
  'mark-series': 'IWC Mark replica aviation watches, including Mark XV and Mark XVIII searches: a more compact cockpit case than Big Pilot.',
  'big-pilot': 'IWC Big Pilot replica oversized three-hand cockpit watches—the large case and diamond-shaped crown that define the line.',
  'top-gun': 'IWC Top Gun replica stealth aviation pieces; darker finishes than a classic steel Big Pilot.',
  aquatimer: 'IWC Aquatimer replica dive watches, including Aquatimer 2000 searches when those thicker references are live.',
};

export const aboutCollectionLinks = collections.map((collection) => ({
  href: collectionPath(collection.slug),
  name: collection.name,
  line: aboutCollectionLines[collection.slug] ?? `Published replica IWC watches in the ${collection.name} collection.`,
}));

export const aboutPillars: { icon: FeatureIconName; title: string; text: string }[] = [
  {
    icon: 'quality',
    title: 'QC photos before dispatch',
    text: 'You see the actual replica IWC watch before it ships. QC photos are how this catalog keeps the listed piece and the packed piece the same watch.',
  },
  {
    icon: 'shipping',
    title: 'Tax-free worldwide shipping',
    text: 'International orders of IWC replica watches ship tax-free. Delivery is tracked; times vary by destination. Packing follows the same care as every store shipment.',
  },
  {
    icon: 'support',
    title: 'One-year movement warranty',
    text: 'Movement cover runs one year. WhatsApp support is available 24/7 if you need a spec checked, a collection explained, or after-sales help once the watch arrives.',
  },
  {
    icon: 'secure',
    title: 'Secure checkout and returns',
    text: 'Payments are processed securely. Return requests are accepted within 14 days of delivery. Review the watch, the Top 1:1 Clone grade, and the total before you confirm.',
  },
];

export const aboutQuality = {
  heading: 'What Top 1:1 Clone means here',
  paragraphs: [
    'The published grade on this catalog is Top 1:1 Clone when that option is set on the product. 1:1 watches, IWC clone watches, IWC copy watches, IWC first copy, and IWC lookalike are shopping phrases for a closer case and dial match than a loosely inspired piece. They are not IWC factory grades.',
    'Replika IWC and IWC watches replica searches land on the same listings. Read the spec table for diameter, movement, and crystal. Compare photos of the case side rather than treating the nickname as a guarantee. If two IWC clone models share a family, the millimetres still decide how the watch wears.',
  ],
};

export const aboutDisclaimer = {
  heading: 'Independent of IWC Schaffhausen',
  paragraphs: [
    'IWC, IWC Schaffhausen, Pilot, Portugieser, Portofino, Ingenieur, Da Vinci, Spitfire, Big Pilot, Top Gun, Aquatimer, and related names describe the look of independently built replica IWC watches. IWC-Replica.com is not affiliated with, authorized by, or endorsed by IWC Schaffhausen or Richemont.',
    'Nothing on this site should be read as boutique provenance, an IWC serial practice, or an official warranty. Shop the [collections](/collections/) as replica documentation. For shipping and returns detail, see the [shipping](/shipping-policy/) and [returns](/returns-refunds/) pages, or [contact](/contact/) support.',
  ],
};

export const aboutCta = {
  heading: 'Open the catalog',
  text: 'Start with a collection if you already know the line, or write if you want the listing checked before you order.',
  primary: { href: '/collections/', label: 'Shop collections' },
  secondary: { href: '/contact/', label: 'Contact support' },
} as const;

export const aboutFaqs: FaqItem[] = [
  {
    question: 'What does IWC-Replica.com sell?',
    answer:
      'IWC-Replica.com sells replica IWC watches grouped by collection: [Pilots](/collections/pilots/), [Portuguese](/collections/portuguese/), [Portofino](/collections/portofino/), [Ingenieur](/collections/ingenieur/), [Da Vinci](/collections/da-vinci/), [Spitfire](/collections/spitfire/), [Mark Series](/collections/mark-series/), [Big Pilot](/collections/big-pilot/), [Top Gun](/collections/top-gun/), and [Aquatimer](/collections/aquatimer/). Each published IWC replica watch shows photos, specs, and a Top 1:1 Clone price when that grade is set.',
  },
  {
    question: 'Are these genuine IWC Schaffhausen watches?',
    answer:
      'No. An IWC replica on this catalog is independently built and is not a genuine IWC Schaffhausen product. Listings use collection names so you can find the look you want. They are not authorized boutique stock and do not carry an official IWC warranty.',
  },
  {
    question: 'Do you send QC photos before a replica IWC watch ships?',
    answer:
      'Yes. QC photos of the actual watch are sent before dispatch. Approve the piece you were shown. If a detail on the dial, case, or bracelet is wrong, raise it before the watch leaves—not after it is in transit. WhatsApp support is available 24/7 for that review.',
  },
  {
    question: 'What warranty comes with an IWC replica?',
    answer:
      'Published orders include a one-year movement warranty from delivery. After-sales cards are store documents, not an IWC international warranty. Return requests are accepted within 14 days of delivery. Shipping is tax-free worldwide; delivery times vary by destination.',
  },
  {
    question: 'What does 1:1 watches or IWC clone mean on this site?',
    answer:
      '1:1 watches, IWC clone, IWC copy watches, IWC first copy, and IWC lookalike describe a closer visual match than a loosely inspired piece. The published grade here is Top 1:1 Clone when that option is on the product. Always confirm diameter, movement, and photos on the listing. IWC watches replicas in the same family can still wear very differently.',
  },
  {
    question: 'How do I choose a collection?',
    answer:
      'Start with the design you already have in mind. A replica IWC Pilot watch lives in [Pilots](/collections/pilots/), [Big Pilot](/collections/big-pilot/), [Top Gun](/collections/top-gun/), or [Mark Series](/collections/mark-series/). A Portugieser watch belongs in [Portuguese](/collections/portuguese/). Dress pieces sit in [Portofino](/collections/portofino/); bracelet sport in [Ingenieur](/collections/ingenieur/); dive in [Aquatimer](/collections/aquatimer/). [Best Sellers](/collections/best-sellers/) helps when you want a short list of the best IWC replica options already drawing attention.',
  },
];
