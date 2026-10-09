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
      { id: 'bump', name: 'Bump', type: 'normal', power: 35 },
      { id: 'spark', name: 'Spark', type: 'fire', power: 45 },
      { id: 'splash-shot', name: 'Splash Shot', type: 'water', power: 45 },
    ],
    species: [
      {
        id: 'emberpup',
        name: 'Emberpup',
        type: 'fire',
        image: 'emberpup.svg',
        baseStats: { hp: 50, attack: 55, defense: 45 },
        moves: ['bump', 'spark'],
      },
    ],
  };
}

/** Problems reported for some data, or [] if it is valid. */
function problemsOf(data: unknown): string[] {
  try {
    validateCreatureData(data);
    return [];
  } catch (err) {
    if (err instanceof CreatureDataError) return err.problems;
    throw err;
  }
}

function mutated(edit: (d: any) => void): unknown {
  const d = sample();
  edit(d);
  return d;
}

describe('validateCreatureData', () => {
  it('accepts well-formed data and returns it typed', () => {
    const data = validateCreatureData(sample());
    expect(data.species[0].name).toBe('Emberpup');
    expect(data.moves).toHaveLength(3);
  });

  it('accepts the shipped creatures.json with 6 species covering all 3 types', () => {
    const data = validateCreatureData(shipped);
    expect(data.species).toHaveLength(6);
    expect(new Set(data.species.map((s) => s.type))).toEqual(new Set(['fire', 'water', 'leaf']));
  });

  it('rejects non-object input', () => {
    expect(() => validateCreatureData(null)).toThrow(CreatureDataError);
    expect(() => validateCreatureData('nope')).toThrow(CreatureDataError);
    expect(() => validateCreatureData([])).toThrow(CreatureDataError);
  });

  it('requires a moves list and a non-empty species list', () => {
    expect(problemsOf({ species: sample().species })).toContainEqual(expect.stringMatching(/"moves" must be a list/));
    expect(problemsOf({ moves: sample().moves, species: [] })).toContainEqual(
      expect.stringMatching(/"species" must be a non-empty list/),
    );
    expect(problemsOf({ moves: sample().moves })).toContainEqual(expect.stringMatching(/"species"/));
  });

  it('reports entries that are not objects', () => {
    expect(problemsOf(mutated((d) => d.moves.push(7)))).toContainEqual('move #4 is not an object');
    expect(problemsOf(mutated((d) => d.species.push('x')))).toContainEqual('species #2 is not an object');
  });

  it('reports missing id and name', () => {
    const p = problemsOf(mutated((d) => { delete d.species[0].id; delete d.species[0].name; }));
    expect(p).toContainEqual('species #1: missing id');
    expect(p).toContainEqual('species #1: missing name');
    const m = problemsOf(mutated((d) => { delete d.moves[0].name; }));
    expect(m).toContainEqual('move "bump": missing name');
  });

  it('rejects ids that are not lowercase-dash words (e.g. stray spaces)', () => {
    expect(problemsOf(mutated((d) => (d.species[0].id = ' Emberpup')))).toContainEqual(
      expect.stringMatching(/id must be lowercase/),
    );
  });

  it('reports a species that references an unknown move, naming both', () => {
    expect(problemsOf(mutated((d) => (d.species[0].moves = ['bump', 'fireball'])))).toContainEqual(
      'species "emberpup": unknown move "fireball"',
    );
  });

  it('explains a move reference that is not a text id', () => {
    expect(problemsOf(mutated((d) => (d.species[0].moves = ['bump', { id: 'spark' }])))).toContainEqual(
      expect.stringMatching(/emberpup.*move ids in quotes/),
    );
  });

  it('requires one normal move and one move of the creature\'s own type', () => {
    const rule = /needs one normal move and one fire move/;
    expect(problemsOf(mutated((d) => (d.species[0].moves = ['bump', 'bump'])))).toContainEqual(expect.stringMatching(rule));
    expect(problemsOf(mutated((d) => (d.species[0].moves = ['spark', 'spark'])))).toContainEqual(expect.stringMatching(rule));
    expect(problemsOf(mutated((d) => (d.species[0].moves = ['bump', 'splash-shot'])))).toContainEqual(expect.stringMatching(rule));
  });

  it('rejects duplicate species and move ids, ignoring case, without "undefined" noise', () => {
    expect(problemsOf(mutated((d) => d.species.push({ ...d.species[0] })))).toContainEqual(
      'duplicate species id "emberpup"',
    );
    expect(problemsOf(mutated((d) => d.moves.push({ ...d.moves[0] })))).toContainEqual('duplicate move id "bump"');
    const twoMissing = problemsOf(mutated((d) => {
      d.species.push({ ...d.species[0] });
      delete d.species[0].id;
      delete d.species[1].id;
    }));
    expect(twoMissing.join('\n')).not.toMatch(/undefined/);
  });

  it('rejects an unknown creature type', () => {
    expect(problemsOf(mutated((d) => (d.species[0].type = 'rock')))).toContainEqual(
      expect.stringMatching(/emberpup.*type must be/),
    );
  });

  it('rejects missing or badly named image files', () => {
    expect(problemsOf(mutated((d) => (d.species[0].image = '')))).toContainEqual(expect.stringMatching(/missing image/));
    for (const bad of ['emberpup', 'emberpup.sv', '../secret.png', 'art/emberpup.png']) {
      expect(problemsOf(mutated((d) => (d.species[0].image = bad)))).toContainEqual(
        expect.stringMatching(/image must be a file name/),
      );
    }
    expect(problemsOf(mutated((d) => (d.species[0].image = 'Fire_Kitty-2.png')))).toEqual([]);
  });

  it('rejects missing or out-of-range base stats', () => {
    expect(problemsOf(mutated((d) => (d.species[0].baseStats.attack = 0)))).toContainEqual(
      expect.stringMatching(/baseStats.attack/),
    );
    expect(problemsOf(mutated((d) => delete d.species[0].baseStats))).toContainEqual(
      'species "emberpup": missing baseStats',
    );
  });

  it('requires exactly 2 moves', () => {
    expect(problemsOf(mutated((d) => (d.species[0].moves = ['bump'])))).toContainEqual(
      'species "emberpup": must have exactly 2 moves',
    );
  });

  it('rejects a move with invalid power or type', () => {
    expect(problemsOf(mutated((d) => (d.moves[1].power = -5)))).toContainEqual(expect.stringMatching(/spark.*power/));
    expect(problemsOf(mutated((d) => (d.moves[0].type = 'lava')))).toContainEqual(expect.stringMatching(/bump.*type/));
  });

  it('lists every problem, not just the first', () => {
    const p = problemsOf(mutated((d) => { d.species[0].image = ''; d.moves[0].power = 0; }));
    expect(p).toContainEqual(expect.stringMatching(/emberpup.*missing image/));
    expect(p).toContainEqual(expect.stringMatching(/bump.*power/));
  });
});

describe('statsAtLevel', () => {
  it('matches the balance anchor: base 50 at level 5 = 20 HP, 10 attack, 10 defense', () => {
    expect(statsAtLevel({ hp: 50, attack: 50, defense: 50 }, 5)).toEqual({ maxHp: 20, attack: 10, defense: 10 });
  });

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

  it('rejects levels that are not whole numbers from 1 to 100', () => {
    const base = { hp: 50, attack: 50, defense: 50 };
    for (const bad of [0, -3, 2.5, Number.NaN, 101]) {
      expect(() => statsAtLevel(base, bad)).toThrow(RangeError);
    }
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

  it('gives each creature a unique id without needing crypto.randomUUID (missing on plain-http iPads)', () => {
    const original = crypto.randomUUID;
    try {
      (crypto as any).randomUUID = undefined;
      const species = sample().species[0];
      const a = createCreature(species, 3).uid;
      const b = createCreature(species, 3).uid;
      expect(a).toMatch(/^[0-9a-f]{32}$/);
      expect(a).not.toBe(b);
    } finally {
      (crypto as any).randomUUID = original;
    }
  });
});
