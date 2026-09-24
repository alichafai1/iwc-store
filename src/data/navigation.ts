import type { FooterNav, NavLink } from '../types/navigation';
import { collections } from './collections';

export const headerNav: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/shop/', label: 'Shop' },
  { href: '/collections/', label: 'Collections' },
  { href: '/collections/new-arrivals/', label: 'New Arrival' },
  { href: '/guides/', label: 'Guides' },
  { href: '/blog/', label: 'Blog' },
  { href: '/about/', label: 'About' },
  { href: '/contact/', label: 'Contact' },
];

export const headerCollectionLinks: NavLink[] = [
  ...collections.map((collection) => ({
    href: `/collections/${collection.slug}/`,
    label: collection.name,
  })),
  { href: '/collections/', label: 'View All Collections' },
];

export const footerNav: FooterNav = {
  shop: [
    { href: '/shop/', label: 'Shop' },
    { href: '/collections/new-arrivals/', label: 'New Arrival' },
    { href: '/collections/best-sellers/', label: 'Best Sellers' },
  ],
  collections: collections.map((collection) => ({
    href: `/collections/${collection.slug}/`,
    label: collection.name,
  })),
  customerCare: [
    { href: '/contact/', label: 'Contact' },
    { href: '/about/', label: 'About' },
    { href: '/authors/editorial-team/', label: 'Editorial Team' },
    { href: '/qc-videos/', label: 'QC Videos' },
    { href: '/delivery-proofs/', label: 'Delivery Proofs' },
    { href: '/shipping-policy/', label: 'Shipping' },
    { href: '/returns-refunds/', label: 'Returns' },
    { href: '/warranty-policy/', label: 'Warranty' },
  ],
  legal: [
    { href: '/returns-refunds/', label: 'Return & Refund' },
    { href: '/privacy-policy/', label: 'Privacy Policy' },
    { href: '/shipping-policy/', label: 'Shipping Policy' },
    { href: '/terms/', label: 'Terms of Use' },
    { href: '/warranty-policy/', label: 'Warranty Policy' },
    { href: '/disclaimer/', label: 'Disclaimer' },
  ],
};
