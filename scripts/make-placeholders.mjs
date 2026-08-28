import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'images');

function svg({ width, height, id, from, to, cx, cy, radius, ring }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
  <defs>
    <linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
    <radialGradient id="${id}-face" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="#f7f4ee"/>
      <stop offset="62%" stop-color="#cfc8ba"/>
      <stop offset="100%" stop-color="#8d877b"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#${id}-bg)"/>
  <circle cx="${cx}" cy="${cy}" r="${radius + 28}" fill="none" stroke="${ring}" stroke-width="1.5" opacity="0.7"/>
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="url(#${id}-face)"/>
  <circle cx="${cx}" cy="${cy}" r="${Math.round(radius * 0.72)}" fill="none" stroke="#111111" stroke-width="1" opacity="0.18"/>
  <circle cx="${cx}" cy="${cy}" r="5" fill="#111111"/>
  <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - radius * 0.46}" stroke="#111111" stroke-width="2" stroke-linecap="round"/>
  <line x1="${cx}" y1="${cy}" x2="${cx + radius * 0.32}" y2="${cy + radius * 0.12}" stroke="#111111" stroke-width="1.5" stroke-linecap="round"/>
</svg>
`;
}

const files = [
  ['hero.svg', { width: 1600, height: 1000, id: 'hero', from: '#f3efe6', to: '#d8d2c6', cx: 1080, cy: 520, radius: 230, ring: '#c4a35a' }],
  ['collections/da-vinci.svg', { width: 800, height: 1000, id: 'dv', from: '#f6f1e8', to: '#e0d7c8', cx: 400, cy: 470, radius: 176, ring: '#c4a35a' }],
  ['collections/ingenieur.svg', { width: 800, height: 1000, id: 'in', from: '#eceff1', to: '#d4d8dc', cx: 400, cy: 500, radius: 168, ring: '#9aa0a6' }],
  ['collections/anniversary-series.svg', { width: 800, height: 1000, id: 'an', from: '#f7f3ea', to: '#e8dcc4', cx: 400, cy: 460, radius: 180, ring: '#c4a35a' }],
  ['collections/pilots.svg', { width: 800, height: 1000, id: 'pi', from: '#e8e6e2', to: '#c8c4bc', cx: 400, cy: 490, radius: 172, ring: '#111111' }],
  ['collections/portofino.svg', { width: 800, height: 1000, id: 'po', from: '#f4f0ea', to: '#ddd4c8', cx: 400, cy: 480, radius: 170, ring: '#b08d57' }],
  ['collections/portuguese.svg', { width: 800, height: 1000, id: 'pr', from: '#f2efe8', to: '#d5d0c4', cx: 400, cy: 475, radius: 186, ring: '#c4a35a' }],
  ['collections/spitfire.svg', { width: 800, height: 1000, id: 'sp', from: '#ebe8e2', to: '#cfc8bb', cx: 400, cy: 505, radius: 164, ring: '#8a8478' }],
  ['products/da-vinci-chronograph.svg', { width: 800, height: 800, id: 'p1', from: '#f5f2eb', to: '#ddd6c8', cx: 400, cy: 400, radius: 168, ring: '#c4a35a' }],
  ['products/ingenieur-automatic.svg', { width: 800, height: 800, id: 'p2', from: '#eef0f2', to: '#d2d6da', cx: 400, cy: 400, radius: 160, ring: '#9aa0a6' }],
  ['products/pilots-utc.svg', { width: 800, height: 800, id: 'p3', from: '#e9e7e3', to: '#c5c1b8', cx: 400, cy: 400, radius: 166, ring: '#111111' }],
  ['products/portofino-automatic.svg', { width: 800, height: 800, id: 'p4', from: '#f6f2eb', to: '#e2d8c8', cx: 400, cy: 400, radius: 158, ring: '#b08d57' }],
  ['gallery/one.svg', { width: 800, height: 1000, id: 'g1', from: '#f3efe7', to: '#d9d1c3', cx: 420, cy: 430, radius: 150, ring: '#c4a35a' }],
  ['gallery/two.svg', { width: 800, height: 1000, id: 'g2', from: '#eceae6', to: '#cfc9bf', cx: 360, cy: 520, radius: 140, ring: '#8a8478' }],
  ['gallery/three.svg', { width: 800, height: 1000, id: 'g3', from: '#f7f4ee', to: '#e4dccb', cx: 400, cy: 470, radius: 156, ring: '#c4a35a' }],
  ['gallery/four.svg', { width: 800, height: 1000, id: 'g4', from: '#e8e6e2', to: '#c8c3b8', cx: 390, cy: 500, radius: 148, ring: '#111111' }],
  ['editorial/choosing-a-collection.svg', { width: 1200, height: 800, id: 'e1', from: '#f4f0e8', to: '#d8d0c2', cx: 780, cy: 400, radius: 170, ring: '#c4a35a' }],
  ['editorial/notes-on-finishing.svg', { width: 1200, height: 800, id: 'e2', from: '#eeebe5', to: '#cfc8bc', cx: 420, cy: 400, radius: 164, ring: '#8a8478' }],
  ['editorial/caring-for-a-timepiece.svg', { width: 1200, height: 800, id: 'e3', from: '#f6f3ec', to: '#e0d7c8', cx: 640, cy: 400, radius: 176, ring: '#c4a35a' }],
];

for (const [relative, options] of files) {
  const path = join(root, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, svg(options));
}

console.log(`Wrote ${files.length} placeholder images`);
