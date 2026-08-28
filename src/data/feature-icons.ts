import quality from '../assets/icons/quality.svg';
import secure from '../assets/icons/secure.svg';
import shipping from '../assets/icons/shipping.svg';
import support from '../assets/icons/support.svg';
import type { ImageMetadata } from 'astro';

export const featureIcons = {
  quality,
  secure,
  shipping,
  support,
} as const satisfies Record<string, ImageMetadata>;

export type FeatureIconName = keyof typeof featureIcons;
