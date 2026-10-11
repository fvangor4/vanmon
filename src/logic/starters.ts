// The three buddies offered at the start: the first creature of each type
// (prize-only creatures, "wild": false, are never offered).

import { CREATURE_TYPES, type CreatureData, type SpeciesDef } from './creatures';

export function pickStarters(data: CreatureData): SpeciesDef[] {
  return CREATURE_TYPES.flatMap((type) => data.species.find((s) => s.type === type && s.wild !== false) ?? []);
}
