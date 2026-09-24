import type { FaqItem } from '../types/faq';
import type { DeliveryProof } from '../types/delivery-proof';

export const DELIVERY_PROOFS_PATH = '/delivery-proofs/';

export const deliveryProofs: DeliveryProof[] = [
  {
    id: 'arrival-united-states',
    imageSrc: null,
    imageAlt: 'Delivery tracking confirmation for an IWC replica order to the United States',
    courierLabel: 'Tracked parcel',
    regionLabel: 'United States',
  },
  {
    id: 'arrival-united-kingdom',
    imageSrc: null,
    imageAlt: 'Delivery tracking confirmation for an IWC replica order to the United Kingdom',
    courierLabel: 'Tracked parcel',
    regionLabel: 'United Kingdom',
  },
  {
    id: 'arrival-germany',
    imageSrc: null,
    imageAlt: 'Delivery tracking confirmation for an IWC replica order to Germany',
    courierLabel: 'Tracked parcel',
    regionLabel: 'Germany',
  },
  {
    id: 'arrival-australia',
    imageSrc: null,
    imageAlt: 'Delivery tracking confirmation for an IWC replica order to Australia',
    courierLabel: 'Tracked parcel',
    regionLabel: 'Australia',
  },
  {
    id: 'arrival-canada',
    imageSrc: null,
    imageAlt: 'Delivery tracking confirmation for an IWC replica order to Canada',
    courierLabel: 'Tracked parcel',
    regionLabel: 'Canada',
  },
  {
    id: 'arrival-united-arab-emirates',
    imageSrc: null,
    imageAlt: 'Delivery tracking confirmation for an IWC replica order to the United Arab Emirates',
    courierLabel: 'Tracked parcel',
    regionLabel: 'United Arab Emirates',
  },
];

export const deliveryProofIntro =
      'After the payment is complete, you review the [inspection video](/qc-videos/) first. After you approve, we pack a plain carton, hand it to a tracked courier, and it usually reaches you in nine to twelve days. This page explains that path for [IWC replica](/shop/) orders — [Pilot](/collections/pilots/), [Portugieser](/collections/portuguese/), [Portofino](/collections/portofino/), and the lines beside them.';

export const deliveryProofHighlights = [
  {
    value: 'QC first',
    label: 'Inspection video before the parcel is packed',
  },
  {
    value: '24–48h',
    label: 'Packed and handed to the courier after you approve',
  },
  {
    value: '9–12 days',
    label: 'Usual worldwide transit once tracking is live',
  },
  {
    value: 'Tax-free',
    label: 'Worldwide dispatch as shown in the store banner',
  },
] as const;

export const deliveryJourneyLead =
  'The same three-stage order path as the [shop](/shop/), written here for the parcel itself: inspect, pack, then track.';

export const deliveryJourney = [
  {
    n: '01',
    title: 'Inspection clip, then your go-ahead',
    text: 'Processing usually takes about three days. We check running condition, complications listed on the product page, and finishing. You receive a [QC video](/qc-videos/) of the allocated IWC replica. Nothing is packed until you approve.',
  },
  {
    n: '02',
    title: 'A quiet carton, not a boutique bag',
    text: 'After approval we pack within 24–48 hours. The watch is protected, then placed in a plain outer carton. The shipping face does not carry IWC names, [collection](/collections/) names, or watch wording.',
  },
  {
    n: '03',
    title: 'Tracking when the courier has it',
    text: 'You get a tracking number once the parcel is in the courier network — not while you are still on the [product page](/shop/), and not during QC. Delivery is tracked. Times still depend on the destination you entered.',
  },
  {
    n: '04',
    title: 'The usual worldwide window',
    text: 'Most parcels reach the door in nine to twelve days after dispatch. [Free shipping](/shipping-policy/) applies worldwide. If your address has unusual import rules, [write to us](/contact/) before you pay. [Returns](/returns-refunds/) are handled after delivery.',
  },
] as const;

export const deliveryGalleryLead =
  'Slots below are for arrival screenshots. Addresses will be cropped. These are not product photos — finishing and details sit in the [QC Videos](/qc-videos/) for each watch.';

export const deliveryRegionsLead =
  'Destinations follow the country list used when you order. If a country is in that dropdown, we can send there. If it is not, [ask](/contact/) before you pay. [Shipping](/shipping-policy/) notes sit with the [returns](/returns-refunds/) policy.';

export const deliveryRegions = [
  {
    title: 'North America',
    places: 'United States, Canada, Mexico',
  },
  {
    title: 'United Kingdom & Ireland',
    places: 'United Kingdom, Ireland',
  },
  {
    title: 'Europe',
    places:
      'France, Germany, Italy, Spain, Netherlands, Belgium, Switzerland, Austria, the Nordics, Portugal, Poland, and other EU destinations listed when you order',
  },
  {
    title: 'Middle East',
    places: 'United Arab Emirates, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman, Israel, Türkiye',
  },
  {
    title: 'Asia-Pacific',
    places:
      'Australia, New Zealand, Japan, Singapore, Hong Kong SAR, South Korea, Malaysia, Thailand, Philippines, Indonesia, Vietnam, India, Taiwan, China',
  },
  {
    title: 'Latin America & Africa',
    places: 'Brazil, Argentina, Chile, Colombia, South Africa, Egypt, Morocco',
  },
] as const;

export const deliveryRegionsNote =
  'Not sure about a postcode or island territory? [Write to us](/contact/) with the country and we will confirm before you order.';

export const deliveryProofFaqs: FaqItem[] = [
  {
    question: 'How long does an IWC replica take to arrive?',
    answer:
      'Inspection and the [QC video](/qc-videos/) usually take about three days after payment. Once you approve, packing and handover take 24–48 hours. Transit is typically nine to twelve days worldwide. Add those stages together rather than treating “9–12 days” as the time from the [shop](/shop/). See [shipping](/shipping-policy/) for the dispatch notes.',
  },
  {
    question: 'Can I see the exact watch before it ships?',
    answer:
      'Yes. Every order goes through quality-check filming first. You approve that clip before the carton is sealed. Public examples live on the [QC Videos](/qc-videos/) page. The clip sent for your order is the piece allocated to you, not a stock photo from the [product](/shop/) listing.',
  },
  {
    question: 'Will anyone see that a watch is inside?',
    answer:
      'The outer carton is plain. It does not print IWC, [Pilot](/collections/pilots/), [Portugieser](/collections/portuguese/), or other watch wording on the shipping face. Inside, the watch is wrapped for the journey. Neighbours and lobby staff see a standard international parcel.',
  },
  {
    question: 'Is shipping free, and is it tax-free?',
    answer:
      'Orders use free tracked shipping worldwide, as described on the [shipping policy](/shipping-policy/). The store banner states tax-free worldwide dispatch. Local postal or customs practice can still vary by country. If you already know your destination is strict, [contact us](/contact/) before you order. After delivery, [returns](/returns-refunds/) follow that policy.',
  },
  {
    question: 'When do I receive tracking?',
    answer:
      'After you approve QC and the parcel is with the courier. We do not send a number during inspection. The same email you used when you ordered is where tracking details go. Questions about a number that has not arrived yet go to [contact](/contact/).',
  },
  {
    question: 'Do you ship only IWC replicas?',
    answer:
      'This catalog is IWC [collections](/collections/) only: [Pilot](/collections/pilots/), [Portugieser](/collections/portuguese/), [Portofino](/collections/portofino/), [Big Pilot](/collections/big-pilot/), [Ingenieur](/collections/ingenieur/), [Aquatimer](/collections/aquatimer/), and the other published lines. We do not mix other houses on this site. [Best Sellers](/collections/best-sellers/) is the fastest way into live stock.',
  },
  {
    question: 'What if my country is not listed?',
    answer:
      'The country list on this page follows the destinations available when you order. If you do not see yours in that dropdown, do not assume we can send there. Ask on the [contact](/contact/) page first, then read [shipping](/shipping-policy/) and [about](/about/) if you still have catalog questions. [Guides](/guides/) cover wearing and choosing a collection before you buy.',
  },
];

export const deliveryCloseCopy =
  'The useful proof before you buy is the [inspection clip](/qc-videos/). The useful proof after you approve is tracking. Open the video library, or start from the [collection](/collections/) that matches the reference you want. [Shop](/shop/) if you already know the model.';

export const deliveryProofRelatedLinks = [
  {
    title: 'Shop',
    items: [
      { href: '/shop/', label: 'Shop replica IWC watches' },
      { href: '/collections/', label: 'All collections' },
      { href: '/collections/best-sellers/', label: 'Best Sellers' },
    ],
  },
  {
    title: 'Collections',
    items: [
      { href: '/collections/pilots/', label: 'Pilots' },
      { href: '/collections/portuguese/', label: 'Portuguese' },
      { href: '/collections/portofino/', label: 'Portofino' },
      { href: '/collections/big-pilot/', label: 'Big Pilot' },
      { href: '/collections/ingenieur/', label: 'Ingenieur' },
      { href: '/collections/aquatimer/', label: 'Aquatimer' },
      { href: '/collections/top-gun/', label: 'Top Gun' },
    ],
  },
  {
    title: 'Before you order',
    items: [
      { href: '/qc-videos/', label: 'QC Videos' },
      { href: '/shipping-policy/', label: 'Shipping Policy' },
      { href: '/returns-refunds/', label: 'Return & Refund' },
      { href: '/warranty-policy/', label: 'Warranty Policy' },
      { href: '/contact/', label: 'Contact' },
      { href: '/guides/', label: 'Guides' },
      { href: '/about/', label: 'About' },
    ],
  },
] as const;
