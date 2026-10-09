import { describe, expect, it } from 'vitest';
import { validateCreatureData, type CreatureData } from './creatures';
import { ENCOUNTER_COOLDOWN_STEPS, rollEncounter, speciesForArea, validateAreas, type AreaEncounters } from './encounters';
import { AREAS, MAPS } from '../data/maps';
import { LEVEL_CAP } from './xp';
import shipped from '../../public/data/creatures.json';

const seq = (...values: number[]) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};

const data: CreatureData = {
  moves: [
    { id: 'bump', name: 'Bump', type: 'normal', power: 35 },
    { id: 'spark', name: 'Spark', type: 'fire', power: 45 },
    { id: 'splash', name: 'Splash', type: 'water', power: 45 },
  ],
  species: [
    { id: 'firey', name: 'Firey', type: 'fire', image: 'f.svg', baseStats: { hp: 50, attack: 50, defense: 50 }, moves: ['bump', 'spark'], areas: ['route'] },
    { id: 'watery', name: 'Watery', type: 'water', image: 'w.svg', baseStats: { hp: 50, attack: 50, defense: 50 }, moves: ['bump', 'splash'], areas: ['pond'] },
    { id: 'anywhere', name: 'Anywhere', type: 'water', image: 'a.svg', baseStats: { hp: 50, attack: 50, defense: 50 }, moves: ['bump', 'splash'] },
  ],
};
const route: AreaEncounters = { chance: 0.2, minLevel: 2, maxLevel: 4 };

describe('speciesForArea', () => {
  it('includes species listed for the area, plus species with no areas (they live everywhere)', () => {
    expect(speciesForArea(data, 'route').map((s) => s.id)).toEqual(['firey', 'anywhere']);
    expect(speciesForArea(data, 'pond').map((s) => s.id)).toEqual(['watery', 'anywhere']);
  });
});

describe('rollEncounter', () => {
  const pool = speciesForArea(data, 'route');

  it('meets nothing when the roll misses the chance', () => {
    expect(rollEncounter(route, pool, seq(0.2), 10)).toBeNull();
    expect(rollEncounter(route, pool, seq(0.9), 10)).toBeNull();
  });

  it('meets a creature from the pool at a level in the area range when the roll hits', () => {
    // rolls: chance, species pick, level pick
    expect(rollEncounter(route, pool, seq(0.1, 0, 0), 10)).toEqual({ speciesId: 'firey', level: 2 });
    expect(rollEncounter(route, pool, seq(0.1, 0.99, 0.99), 10)).toEqual({ speciesId: 'anywhere', level: 4 });
  });

  it('gives a few free steps after a battle so kids can walk away', () => {
    expect(ENCOUNTER_COOLDOWN_STEPS).toBeGreaterThan(0);
    expect(rollEncounter(route, pool, seq(0), ENCOUNTER_COOLDOWN_STEPS - 1)).toBeNull();
    expect(rollEncounter(route, pool, seq(0, 0, 0), ENCOUNTER_COOLDOWN_STEPS)).not.toBeNull();
  });

  it('meets nothing in an area with no creatures', () => {
    expect(rollEncounter(route, [], seq(0), 10)).toBeNull();
  });

  it('refuses an rng outside [0, 1)', () => {
    expect(() => rollEncounter(route, pool, seq(1), 10)).toThrow(RangeError);
    expect(() => rollEncounter(route, pool, seq(0.1, Number.NaN), 10)).toThrow(RangeError);
  });

  it('picks every species and level about evenly over many steps', () => {
    let a = 7;
    const rng = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const counts = new Map<string, number>();
    for (let i = 0; i < 20000; i++) {
      const e = rollEncounter(route, pool, rng, 10);
      if (e) counts.set(`${e.speciesId}@${e.level}`, (counts.get(`${e.speciesId}@${e.level}`) ?? 0) + 1);
    }
    expect(counts.size).toBe(6); // 2 species × levels 2,3,4
    const total = [...counts.values()].reduce((x, y) => x + y, 0);
    expect(total / 20000).toBeGreaterThan(0.18);
    expect(total / 20000).toBeLessThan(0.22);
  });
});

describe('validateAreas', () => {
  it('accepts the shipped areas and creatures, with every grass map populated', () => {
    const creatures = validateCreatureData(shipped);
    expect(() => validateAreas(AREAS, creatures, MAPS)).not.toThrow();
    for (const [id, map] of Object.entries(MAPS)) {
      if (map.rows.join('').includes('"')) {
        expect(AREAS[id], `${id} has tall grass`).toBeDefined();
        expect(speciesForArea(creatures, id).length, `${id} has creatures`).toBeGreaterThan(0);
      }
    }
  });

  it('rejects bad chances, level ranges above the cap, unknown maps, and species areas that do not exist', () => {
    expect(() => validateAreas({ route: { chance: 0, minLevel: 2, maxLevel: 3 } }, data, MAPS)).toThrow(/chance/);
    expect(() => validateAreas({ route: { chance: 0.2, minLevel: 5, maxLevel: 3 } }, data, MAPS)).toThrow(/level/);
    expect(() => validateAreas({ route: { chance: 0.2, minLevel: 2, maxLevel: LEVEL_CAP + 1 } }, data, MAPS)).toThrow(/level/);
    expect(() => validateAreas({ moon: route }, data, MAPS)).toThrow(/moon/);
    const typo = { ...data, species: [{ ...data.species[0], areas: ['rout'] }] };
    expect(() => validateAreas({ route }, typo, MAPS)).toThrow(/rout/);
  });
});
