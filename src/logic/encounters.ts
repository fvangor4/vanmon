// Wild encounters in tall grass. Which creatures live where comes from the
// optional "areas" list in creatures.json, so a new creature shows up in the
// grass without any code change (no "areas" = it lives everywhere).

import type { CreatureData, SpeciesDef } from './creatures';
import type { Rng } from './damage';
import type { MapDef } from './map';
import { LEVEL_CAP } from './xp';

/** Steps in tall grass after a battle before the next one can start. */
export const ENCOUNTER_COOLDOWN_STEPS = 3;

export interface AreaEncounters {
  /** Chance per tall-grass step, e.g. 0.15. */
  chance: number;
  minLevel: number;
  maxLevel: number;
}

export interface Encounter {
  speciesId: string;
  level: number;
}

export function speciesForArea(data: CreatureData, mapId: string): SpeciesDef[] {
  return data.species.filter((s) => !s.areas || s.areas.includes(mapId));
}

function roll(rng: Rng): number {
  const r = rng();
  if (!(r >= 0 && r < 1)) throw new RangeError(`rng must return a number in [0, 1), got ${r}`);
  return r;
}

/**
 * Called for each step onto tall grass. Returns the creature met, or null.
 * `stepsSinceBattle` counts tall-grass steps finished *before* this one since
 * the last battle (0 on the first step after a battle, a new game, or a
 * reload), so the first ENCOUNTER_COOLDOWN_STEPS steps are always free.
 */
export function rollEncounter(
  area: AreaEncounters,
  pool: SpeciesDef[],
  rng: Rng,
  stepsSinceBattle: number,
): Encounter | null {
  if (stepsSinceBattle < ENCOUNTER_COOLDOWN_STEPS || pool.length === 0) return null;
  if (roll(rng) >= area.chance) return null;
  const species = pool[Math.floor(roll(rng) * pool.length)];
  const level = area.minLevel + Math.floor(roll(rng) * (area.maxLevel - area.minLevel + 1));
  return { speciesId: species.id, level };
}

/** Throws listing every problem, so a typo in an area name is caught by the tests. */
export function validateAreas(
  areas: Record<string, AreaEncounters>,
  data: CreatureData,
  maps: Record<string, MapDef>,
): void {
  const problems: string[] = [];
  for (const [id, a] of Object.entries(areas)) {
    if (!maps[id]) problems.push(`area "${id}" is not a map`);
    if (!(a.chance > 0 && a.chance <= 1)) problems.push(`area "${id}": chance must be above 0 and at most 1`);
    const levelsOk =
      Number.isInteger(a.minLevel) && Number.isInteger(a.maxLevel) && a.minLevel >= 1 && a.minLevel <= a.maxLevel && a.maxLevel <= LEVEL_CAP;
    if (!levelsOk) problems.push(`area "${id}": levels must be whole numbers with 1 ≤ min ≤ max ≤ ${LEVEL_CAP}`);
  }
  for (const [id, map] of Object.entries(maps)) {
    if (map.rows.some((r) => r.includes('"')) && !areas[id]) problems.push(`map "${id}" has tall grass but no wild creatures area`);
  }
  for (const s of data.species) {
    for (const a of s.areas ?? []) {
      if (!areas[a]) problems.push(`species "${s.id}" lives in "${a}", which has no wild creatures area`);
    }
  }
  if (problems.length > 0) throw new Error(problems.join('\n'));
}
