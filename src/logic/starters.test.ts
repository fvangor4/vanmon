import { describe, expect, it } from 'vitest';
import { pickStarters } from './starters';
import { validateCreatureData } from './creatures';
import shipped from '../../public/data/creatures.json';

describe('pickStarters', () => {
  it('offers the first fire, water and leaf creature, in that order', () => {
    expect(pickStarters(validateCreatureData(shipped)).map((s) => s.id)).toEqual(['emberpup', 'puddlefin', 'sproutle']);
  });

  it('skips a type with no creatures', () => {
    const data = validateCreatureData(shipped);
    const noWater = { ...data, species: data.species.filter((s) => s.type !== 'water') };
    expect(pickStarters(noWater).map((s) => s.type)).toEqual(['fire', 'leaf']);
  });
});
