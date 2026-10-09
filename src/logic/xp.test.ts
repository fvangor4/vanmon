import { describe, expect, it } from 'vitest';
import { createCreature, statsAtLevel, type SpeciesDef } from './creatures';
import { gainXp, LEVEL_CAP, xpForWin, xpToNextLevel } from './xp';

const species: SpeciesDef = {
  id: 'firey', name: 'Firey', type: 'fire', image: 'f.svg',
  baseStats: { hp: 50, attack: 50, defense: 50 }, moves: ['bump', 'spark'],
};

describe('xp curve', () => {
  it('needs more XP for each higher level', () => {
    for (let level = 1; level < LEVEL_CAP; level++) {
      expect(xpToNextLevel(level + 1)).toBeGreaterThan(xpToNextLevel(level));
    }
  });

  it('levels up every 2-3 wins against same-level creatures, all the way to the cap', () => {
    for (let level = 2; level < LEVEL_CAP; level++) {
      const wins = Math.ceil(xpToNextLevel(level) / xpForWin(level));
      expect(wins, `level ${level}`).toBeGreaterThanOrEqual(2);
      expect(wins, `level ${level}`).toBeLessThanOrEqual(3);
    }
    expect(Math.ceil(xpToNextLevel(5) / xpForWin(5))).toBe(2);
  });

  it('gives more XP for beating higher-level creatures', () => {
    expect(xpForWin(8)).toBeGreaterThan(xpForWin(3));
  });
});

describe('gainXp', () => {
  it('adds XP without leveling when under the threshold', () => {
    const c = createCreature(species, 5);
    const { creature, levelUps } = gainXp(c, 10, species);
    expect(creature.xp).toBe(10);
    expect(creature.level).toBe(5);
    expect(levelUps).toEqual([]);
  });

  it('levels up, carries leftover XP, and raises stats', () => {
    const c = createCreature(species, 5);
    const { creature, levelUps } = gainXp(c, xpToNextLevel(5) + 3, species);
    expect(creature.level).toBe(6);
    expect(creature.xp).toBe(3);
    expect(levelUps).toEqual([6]);
    expect(creature).toMatchObject(statsAtLevel(species.baseStats, 6));
  });

  it('can gain several levels at once', () => {
    const c = createCreature(species, 5);
    const { creature, levelUps } = gainXp(c, xpToNextLevel(5) + xpToNextLevel(6), species);
    expect(creature.level).toBe(7);
    expect(levelUps).toEqual([6, 7]);
  });

  it('keeps damage taken but adds the new max HP on level up', () => {
    const c = { ...createCreature(species, 5), hp: 4 };
    const { creature } = gainXp(c, xpToNextLevel(5), species);
    expect(creature.level).toBe(6);
    expect(creature.maxHp).toBeGreaterThan(c.maxHp);
    expect(creature.hp).toBe(4 + (creature.maxHp - c.maxHp));
  });

  it('stops at the level cap and stops counting XP there', () => {
    const c = createCreature(species, LEVEL_CAP - 1);
    const { creature, levelUps } = gainXp(c, 10_000, species);
    expect(creature.level).toBe(LEVEL_CAP);
    expect(creature.xp).toBe(0);
    expect(levelUps).toEqual([LEVEL_CAP]);
    expect(gainXp(creature, 50, species).creature).toEqual(creature);
  });

  it('does not change the creature passed in', () => {
    const c = createCreature(species, 5);
    gainXp(c, 1000, species);
    expect(c.level).toBe(5);
    expect(c.xp).toBe(0);
  });

  it('leaves a creature above the cap unchanged', () => {
    const c = createCreature(species, LEVEL_CAP + 5);
    expect(gainXp(c, 500, species)).toEqual({ creature: c, levelUps: [] });
  });

  it('rejects negative or fractional XP', () => {
    const c = createCreature(species, 5);
    expect(() => gainXp(c, -1, species)).toThrow(RangeError);
    expect(() => gainXp(c, 1.5, species)).toThrow(RangeError);
  });

  it('rejects a creature with a broken level or XP (e.g. from a damaged save)', () => {
    const c = createCreature(species, 5);
    for (const bad of [0, -2, 5.5, Number.NaN]) {
      expect(() => gainXp({ ...c, level: bad }, 10, species)).toThrow(RangeError);
    }
    for (const bad of [-1, 2.5, Number.NaN, '10' as unknown as number]) {
      expect(() => gainXp({ ...c, xp: bad }, 10, species)).toThrow(RangeError);
    }
  });

  it('refuses to apply another species\' stats', () => {
    const c = createCreature(species, 5);
    expect(() => gainXp(c, 10, { ...species, id: 'watery' })).toThrow(/watery/);
  });
});
