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

  it('never includes species marked wild: false', () => {
    const withPrize: CreatureData = {
      ...data,
      species: [...data.species, { ...data.species[2], id: 'prize', wild: false }],
    };
    expect(speciesForArea(withPrize, 'route').map((s) => s.id)).toEqual(['firey', 'anywhere']);
    expect(speciesForArea(withPrize, 'pond').map((s) => s.id)).toEqual(['watery', 'anywhere']);
  });

  it('keeps Super Shadehog (and any prize-only creature) out of the shipped grass, and every wild one in it somewhere', () => {
    const creatures = validateCreatureData(shipped);
    expect(creatures.species.find((s) => s.id === 'super-shadehog')?.wild).toBe(false);
    const inGrass = new Set(Object.keys(AREAS).flatMap((id) => speciesForArea(creatures, id).map((s) => s.id)));
    for (const s of creatures.species) {
      if (s.wild === false) expect(inGrass, s.id).not.toContain(s.id);
      else expect(inGrass, s.id).toContain(s.id);
    }
  });

  it('keeps the kids\' pond creatures at the pond only, with Shiny Zoomhog rare', () => {
    const creatures = validateCreatureData(shipped);
    const pond = speciesForArea(creatures, 'pond').map((s) => s.id);
    const route = speciesForArea(creatures, 'route').map((s) => s.id);
    for (const id of ['shiny-zoomhog', 'xpeoon']) {
      expect(pond, id).toContain(id);
      expect(route, id).not.toContain(id);
    }
    expect(creatures.species.find((s) => s.id === 'shiny-zoomhog')?.rare).toBe(true);
    expect(creatures.species.find((s) => s.id === 'xpeoon')?.rare).toBeUndefined();
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

  it('gives a rare creature half the chance of a normal one', () => {
    // 3 normal (weight 1 each) + 1 rare (weight 0.5): the rare one owns the last 0.5 / 3.5 of the pick roll.
    const rarePool = [...pool, data.species[1], { ...data.species[1], id: 'shiny', rare: true }];
    const pick = (r: number) => rollEncounter(route, rarePool, seq(0.1, r, 0), 10)?.speciesId;
    expect(pick(0)).toBe('firey');
    expect(pick(2.99 / 3.5)).toBe('watery');
    expect(pick(3.01 / 3.5)).toBe('shiny');
    expect(pick(0.999)).toBe('shiny');
    // Rare first in the pool: its slot is the first 0.5 / 3.5.
    const rareFirst = [rarePool[3], ...rarePool.slice(0, 3)];
    const pickFirst = (r: number) => rollEncounter(route, rareFirst, seq(0.1, r, 0), 10)?.speciesId;
    expect(pickFirst(0.49 / 3.5)).toBe('shiny');
    expect(pickFirst(0.51 / 3.5)).toBe('firey');
  });

  it('picks exactly as before when no creature is rare (same roll, same creature)', () => {
    const plain = [...pool, data.species[1]]; // firey, anywhere, watery
    for (const r of [0, 0.2, 1 / 3 - 1e-9, 1 / 3, 0.5, 2 / 3, 0.9, 0.999]) {
      expect(rollEncounter(route, plain, seq(0.1, r, 0), 10)?.speciesId, `roll ${r}`).toBe(plain[Math.floor(r * 3)].id);
    }
  });

  it('picks every species and level evenly over many steps', () => {
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
    for (const [bucket, n] of counts) {
      expect(n / total, bucket).toBeGreaterThan(1 / 6 - 0.03);
      expect(n / total, bucket).toBeLessThan(1 / 6 + 0.03);
    }
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

  it('rejects bad chances, bad level ranges, unknown maps, and species areas that do not exist', () => {
    const routeOnly = { ...data, species: [data.species[0], data.species[2]] }; // nothing needs "pond"
    const routeMaps = { town: MAPS.town, route: MAPS.route };
    expect(() => validateAreas({ route }, routeOnly, routeMaps)).not.toThrow();
    for (const chance of [0, 1.5, Number.NaN]) {
      expect(() => validateAreas({ route: { ...route, chance } }, routeOnly, routeMaps), `chance ${chance}`).toThrow(/chance/);
    }
    for (const [minLevel, maxLevel] of [[5, 3], [0, 3], [2.5, 3], [2, LEVEL_CAP + 1]]) {
      expect(() => validateAreas({ route: { ...route, minLevel, maxLevel } }, routeOnly, routeMaps), `${minLevel}-${maxLevel}`).toThrow(/level/);
    }
    expect(() => validateAreas({ route, moon: route }, routeOnly, routeMaps)).toThrow(/moon/);
    expect(() => validateAreas({ route }, routeOnly, { ...routeMaps, meadow: { ...MAPS.route, id: 'meadow' } })).toThrow(/meadow.*tall grass/);
    const typo = { ...data, species: [{ ...data.species[0], areas: ['rout'] }] };
    expect(() => validateAreas({ route }, typo, routeMaps)).toThrow(/rout/);
  });
});
