import { describe, expect, it } from 'vitest';
import { createCreature, statsAtLevel, type SpeciesDef } from './creatures';
import { gainXp, LEVEL_CAP, xpFillSteps, xpForWin, xpFraction, xpToNextLevel } from './xp';

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

describe('xpFraction (how full the EXP bar is)', () => {
  it('is the share of XP toward the next level', () => {
    expect(xpFraction(5, 0)).toBe(0);
    expect(xpFraction(5, 25)).toBe(0.5);
    expect(xpFraction(1, 9)).toBeCloseTo(0.9);
  });

  it('is full at or past the level cap', () => {
    expect(xpFraction(LEVEL_CAP, 0)).toBe(1);
    expect(xpFraction(LEVEL_CAP + 3, 0)).toBe(1);
  });

  it('never spills past the ends for odd saved values', () => {
    expect(xpFraction(5, 999)).toBe(1);
    expect(xpFraction(5, -4)).toBe(0);
  });
});

describe('xpFillSteps (the EXP bar filling after a win)', () => {
  it('fills once within the same level', () => {
    expect(xpFillSteps({ level: 5, xp: 10 }, { level: 5, xp: 30 })).toEqual([{ level: 5, from: 0.2, to: 0.6 }]);
  });

  it('fills to the end, then refills from empty at the new level', () => {
    expect(xpFillSteps({ level: 5, xp: 30 }, { level: 6, xp: 15 })).toEqual([
      { level: 5, from: 0.6, to: 1 },
      { level: 6, from: 0, to: 0.25 },
    ]);
  });

  it('runs through every level gained at once', () => {
    expect(xpFillSteps({ level: 5, xp: 40 }, { level: 7, xp: 0 })).toEqual([
      { level: 5, from: 0.8, to: 1 },
      { level: 6, from: 0, to: 1 },
      { level: 7, from: 0, to: 0 },
    ]);
  });

  it('ends full on reaching the cap', () => {
    expect(xpFillSteps({ level: LEVEL_CAP - 1, xp: 95 }, { level: LEVEL_CAP, xp: 0 })).toEqual([
      { level: LEVEL_CAP - 1, from: 0.5, to: 1 },
      { level: LEVEL_CAP, from: 1, to: 1 },
    ]);
  });

  it('stays full when already at the cap', () => {
    expect(xpFillSteps({ level: LEVEL_CAP, xp: 0 }, { level: LEVEL_CAP, xp: 0 })).toEqual([{ level: LEVEL_CAP, from: 1, to: 1 }]);
  });

  it('gives one step per level, matching what gainXp reports', () => {
    const c = createCreature(species, 3);
    const { creature, levelUps } = gainXp(c, 200, species);
    const steps = xpFillSteps(c, creature);
    expect(steps.slice(1).map((s) => s.level)).toEqual(levelUps);
  });
});
