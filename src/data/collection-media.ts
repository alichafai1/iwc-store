import daVinci from '../assets/images/collections/da-vinci.svg';
import ingenieur from '../assets/images/collections/ingenieur.svg';
import markSeries from '../assets/images/collections/anniversary-series.svg';
import pilots from '../assets/images/collections/pilots.svg';
import portofino from '../assets/images/collections/portofino.svg';
import portuguese from '../assets/images/collections/portuguese.svg';
import spitfire from '../assets/images/collections/spitfire.svg';
import type { ImageMetadata } from 'astro';

export const collectionImages: Record<string, ImageMetadata> = {
  'da-vinci': daVinci,
  ingenieur,
  'mark-series': markSeries,
  pilots,
  portofino,
  portuguese,
  spitfire,
  'big-pilot': pilots,
  'top-gun': pilots,
  aquatimer: ingenieur,
};

export function getCollectionImage(slug: string): ImageMetadata {
  return collectionImages[slug] ?? collectionImages['da-vinci'];
}
