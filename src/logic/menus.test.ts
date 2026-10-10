import { describe, expect, it } from 'vitest';
import { bookEntries, bookProgress, pageCount, pageOf } from './menus';
import type { CreatureData, SpeciesDef } from './creatures';

const sp = (id: string): SpeciesDef => ({
  id, name: id, type: 'fire', image: `${id}.svg`, baseStats: { hp: 50, attack: 50, defense: 50 }, moves: ['bump', 'spark'],
});
const data: CreatureData = {
  moves: [],
  species: ['emberpup', 'toastle', 'puddlefin', 'bubbloo', 'sproutle', 'leafbun'].map(sp),
};

describe('bookEntries', () => {
  it('lists every species in data order with caught / seen / unknown', () => {
    const entries = bookEntries(data, { emberpup: 'caught', bubbloo: 'seen', ghost: 'caught' });
    expect(entries.map((e) => [e.species.id, e.status])).toEqual([
      ['emberpup', 'caught'],
      ['toastle', 'unknown'],
      ['puddlefin', 'unknown'],
      ['bubbloo', 'seen'],
      ['sproutle', 'unknown'],
      ['leafbun', 'unknown'],
    ]);
  });

  it('counts how many are caught out of all', () => {
    expect(bookProgress(data, { emberpup: 'caught', bubbloo: 'seen', ghost: 'caught' })).toEqual({ caught: 1, seen: 2, total: 6 });
  });
});

describe('paging', () => {
  const items = Array.from({ length: 13 }, (_, i) => i);

  it('splits a list into pages of a fixed size', () => {
    expect(pageCount(items, 6)).toBe(3);
    expect(pageOf(items, 0, 6)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(pageOf(items, 2, 6)).toEqual([12]);
  });

  it('always has at least one (possibly empty) page, and clamps page numbers', () => {
    expect(pageCount([], 6)).toBe(1);
    expect(pageOf([], 0, 6)).toEqual([]);
    expect(pageOf(items, 9, 6)).toEqual([12]);
    expect(pageOf(items, -1, 6)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
