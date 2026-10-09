// Experience and leveling. Tuned so a creature levels up about every 2 wins,
// because watching your creature grow is the fun part for young kids.

import { statsAtLevel, type Creature, type SpeciesDef } from './creatures';

/** Highest level in this version of the game. */
export const LEVEL_CAP = 20;

export function xpToNextLevel(level: number): number {
  return level * 10;
}

export function xpForWin(wildLevel: number): number {
  return 10 + wildLevel * 4;
}

export interface XpResult {
  creature: Creature;
  /** Each new level reached, in order (empty if none). */
  levelUps: number[];
}

export function gainXp(prev: Creature, amount: number, species: SpeciesDef): XpResult {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new RangeError(`XP must be a whole number 0 or more, got ${amount}`);
  }
  const creature = { ...prev };
  const levelUps: number[] = [];
  if (creature.level >= LEVEL_CAP) return { creature, levelUps };

  creature.xp += amount;
  while (creature.level < LEVEL_CAP && creature.xp >= xpToNextLevel(creature.level)) {
    creature.xp -= xpToNextLevel(creature.level);
    creature.level += 1;
    levelUps.push(creature.level);
  }
  if (creature.level >= LEVEL_CAP) creature.xp = 0;

  if (levelUps.length > 0) {
    const stats = statsAtLevel(species.baseStats, creature.level);
    creature.hp += stats.maxHp - creature.maxHp;
    Object.assign(creature, stats);
  }
  return { creature, levelUps };
}
