import { describe, expect, it } from 'vitest';
import { pickStarters } from './starters';
import { validateCreatureData } from './creatures';
import shipped from '../../public/data/creatures.json';

describe('pickStarters', () => {
  it('offers the first fire, water and leaf creature, in that order', () => {
    const data = validateCreatureData(shipped);
    const sp = (id: string, type: string) => ({ ...data.species[0], id, type: type as 'fire' });
    const mixed = { ...data, species: [sp('w1', 'water'), sp('l1', 'leaf'), sp('f1', 'fire'), sp('f2', 'fire'), sp('w2', 'water')] };
    expect(pickStarters(mixed).map((s) => s.id)).toEqual(['f1', 'w1', 'l1']);
  });

  // Starters are the first of each type in creatures.json, so new creatures must go at the end.
  it('keeps the shipped starters as Emberpup, Puddlefin and Sproutle', () => {
    expect(pickStarters(validateCreatureData(shipped)).map((s) => s.id)).toEqual(['emberpup', 'puddlefin', 'sproutle']);
  });

  it('never offers a prize-only (wild: false) creature', () => {
    const data = validateCreatureData(shipped);
    const sp = (id: string, wild?: boolean) => ({ ...data.species[0], id, type: 'fire' as const, wild });
    const prizeFirst = { ...data, species: [sp('prize', false), sp('f1'), sp('f2', true)] };
    expect(pickStarters(prizeFirst).map((s) => s.id)).toEqual(['f1']);
  });

  it('skips a type with no creatures', () => {
    const data = validateCreatureData(shipped);
    const noWater = { ...data, species: data.species.filter((s) => s.type !== 'water') };
    expect(pickStarters(noWater).map((s) => s.type)).toEqual(['fire', 'leaf']);
  });
});
