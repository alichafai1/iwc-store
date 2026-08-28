import type { FooterNav, NavLink } from '../types/navigation';
import { collections } from './collections';

export const headerNav: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/collections/', label: 'Shop' },
  { href: '/collections/', label: 'Collections' },
  { href: '/collections/new-arrivals/', label: 'New Arrival' },
  { href: '/guides/', label: 'Guides' },
  { href: '/blog/', label: 'Blog' },
  { href: '/about/', label: 'About' },
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
    { href: '/collections/', label: 'Shop' },
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
    { href: '/shipping-policy/', label: 'Shipping' },
    { href: '/returns-refunds/', label: 'Returns' },
  ],
  legal: [
    { href: '/shipping-policy/', label: 'Shipping Policy' },
    { href: '/returns-refunds/', label: 'Returns & Refunds' },
    { href: '/privacy-policy/', label: 'Privacy Policy' },
    { href: '/terms/', label: 'Terms' },
  ],
};
