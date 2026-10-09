import { describe, expect, it } from 'vitest';
import { validateCreatureData } from './creatures';
import shipped from '../../public/data/creatures.json';

// Every image file in public/creatures/, keyed by file name.
const artFiles = new Set(
  Object.keys(import.meta.glob('../../public/creatures/*', { query: '?url', import: 'default' })).map(
    (path) => path.split('/').pop()!,
  ),
);

describe('creature art', () => {
  it('has an image file for every species in creatures.json', () => {
    const missing = validateCreatureData(shipped)
      .species.map((s) => s.image)
      .filter((image) => !artFiles.has(image));
    expect(missing).toEqual([]);
  });
});
