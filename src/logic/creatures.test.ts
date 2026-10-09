import { describe, expect, it } from 'vitest';
import {
  CreatureDataError,
  createCreature,
  statsAtLevel,
  validateCreatureData,
  type CreatureData,
} from './creatures';
import shipped from '../../public/data/creatures.json';

function sample(): CreatureData {
  return {
    moves: [
      { id: 'tackle', name: 'Tackle', type: 'normal', power: 35 },
      { id: 'ember', name: 'Ember', type: 'fire', power: 45 },
    ],
    species: [
      {
        id: 'emberpup',
        name: 'Emberpup',
        type: 'fire',
        image: 'emberpup.svg',
        baseStats: { hp: 50, attack: 55, defense: 45 },
        moves: ['tackle', 'ember'],
      },
    ],
  };
}

describe('validateCreatureData', () => {
  it('accepts well-formed data and returns it typed', () => {
    const data = validateCreatureData(sample());
    expect(data.species[0].name).toBe('Emberpup');
    expect(data.moves).toHaveLength(2);
  });

  it('accepts the shipped creatures.json with 6 species covering all 3 types', () => {
    const data = validateCreatureData(shipped);
    expect(data.species).toHaveLength(6);
    expect(new Set(data.species.map((s) => s.type))).toEqual(new Set(['fire', 'water', 'leaf']));
    for (const s of data.species) {
      const moveTypes = s.moves.map((id) => data.moves.find((m) => m.id === id)!.type);
      expect(moveTypes).toContain('normal');
      expect(moveTypes).toContain(s.type);
    }
  });

  it('rejects non-object input', () => {
    expect(() => validateCreatureData(null)).toThrow(CreatureDataError);
    expect(() => validateCreatureData('nope')).toThrow(CreatureDataError);
  });

  it('reports a species that references an unknown move, naming both', () => {
    const d = sample();
    d.species[0].moves = ['tackle', 'fireball'];
    expect(() => validateCreatureData(d)).toThrow(/emberpup.*fireball/);
  });

  it('rejects duplicate species ids', () => {
    const d = sample();
    d.species.push({ ...d.species[0] });
    expect(() => validateCreatureData(d)).toThrow(/duplicate.*emberpup/i);
  });

  it('rejects an unknown creature type', () => {
    const d = sample() as any;
    d.species[0].type = 'rock';
    expect(() => validateCreatureData(d)).toThrow(/emberpup.*type/);
  });

  it('rejects missing image, bad stats, and wrong move count', () => {
    const noImage = sample() as any;
    noImage.species[0].image = '';
    expect(() => validateCreatureData(noImage)).toThrow(/image/);

    const badStat = sample() as any;
    badStat.species[0].baseStats.attack = 0;
    expect(() => validateCreatureData(badStat)).toThrow(/attack/);

    const oneMove = sample() as any;
    oneMove.species[0].moves = ['tackle'];
    expect(() => validateCreatureData(oneMove)).toThrow(/2 moves/);
  });

  it('rejects a move with invalid power or type', () => {
    const d = sample() as any;
    d.moves[1].power = -5;
    expect(() => validateCreatureData(d)).toThrow(/ember.*power/);
    const e = sample() as any;
    e.moves[0].type = 'lava';
    expect(() => validateCreatureData(e)).toThrow(/tackle.*type/);
  });

  it('lists every problem, not just the first', () => {
    const d = sample() as any;
    d.species[0].image = '';
    d.moves[0].power = 0;
    try {
      validateCreatureData(d);
      expect.unreachable();
    } catch (err) {
      expect((err as CreatureDataError).problems.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('statsAtLevel', () => {
  it('grows every stat with level', () => {
    const base = { hp: 50, attack: 55, defense: 45 };
    const l5 = statsAtLevel(base, 5);
    const l20 = statsAtLevel(base, 20);
    expect(l20.maxHp).toBeGreaterThan(l5.maxHp);
    expect(l20.attack).toBeGreaterThan(l5.attack);
    expect(l20.defense).toBeGreaterThan(l5.defense);
  });

  it('gives higher-base species higher stats at the same level', () => {
    const weak = statsAtLevel({ hp: 40, attack: 40, defense: 40 }, 10);
    const strong = statsAtLevel({ hp: 70, attack: 70, defense: 70 }, 10);
    expect(strong.maxHp).toBeGreaterThan(weak.maxHp);
    expect(strong.attack).toBeGreaterThan(weak.attack);
  });

  it('returns whole numbers', () => {
    const s = statsAtLevel({ hp: 47, attack: 53, defense: 41 }, 7);
    for (const v of Object.values(s)) expect(Number.isInteger(v)).toBe(true);
  });
});

describe('createCreature', () => {
  it('creates a full-HP creature at the given level with zero XP', () => {
    const species = sample().species[0];
    const c = createCreature(species, 5);
    expect(c.speciesId).toBe('emberpup');
    expect(c.level).toBe(5);
    expect(c.xp).toBe(0);
    expect(c.hp).toBe(c.maxHp);
    expect(c).toMatchObject(statsAtLevel(species.baseStats, 5));
  });

  it('gives each creature a unique id', () => {
    const species = sample().species[0];
    expect(createCreature(species, 3).uid).not.toBe(createCreature(species, 3).uid);
  });
});
