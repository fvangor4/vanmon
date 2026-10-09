import { describe, expect, it } from 'vitest';
import { validateCreatureData } from './creatures';
import shipped from '../../public/data/creatures.json';

// Every file in public/creatures/, keyed by file name.
const artPaths = import.meta.glob('../../public/creatures/*', { query: '?raw', import: 'default', eager: true });
const art = new Map(Object.entries(artPaths).map(([path, text]) => [path.split('/').pop()!, text as string]));

describe('creature art', () => {
  it('has an image file for every species in creatures.json', () => {
    const missing = validateCreatureData(shipped)
      .species.map((s) => s.image)
      .filter((image) => !art.has(image));
    expect(missing).toEqual([]);
  });

  it('gives every SVG a root <svg> with explicit width and height (Phaser + iOS need them)', () => {
    const svgs = [...art].filter(([name]) => name.endsWith('.svg'));
    expect(svgs.length).toBeGreaterThan(0);
    for (const [name, text] of svgs) {
      const root = text.trim().match(/^<svg\b[^>]*>/)?.[0];
      expect(root, `${name} should start with <svg ...>`).toBeDefined();
      expect(root, `${name} width`).toMatch(/\swidth="\d+"/);
      expect(root, `${name} height`).toMatch(/\sheight="\d+"/);
      expect(text.trim().endsWith('</svg>'), `${name} should end with </svg>`).toBe(true);
    }
  });
});
