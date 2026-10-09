// Catching. The ball wiggles up to 3 times; each wiggle can fail, so the kids
// get a little suspense. It usually works, and works more often when the wild
// creature is tired (low HP).

import type { Rng } from './damage';

const WIGGLES = 3;

/** 60% at full HP, rising to 95% as HP nears 0. */
export function catchChance({ hp, maxHp }: { hp: number; maxHp: number }): number {
  return 0.6 + 0.35 * (1 - hp / maxHp);
}

export interface CatchRoll {
  /** Wiggles shown before it caught (3) or broke free (0-2). */
  wiggles: number;
  caught: boolean;
}

export function rollCatch(wild: { hp: number; maxHp: number }, rng: Rng): CatchRoll {
  // Three independent checks whose combined odds equal catchChance.
  const perWiggle = Math.cbrt(catchChance(wild));
  for (let wiggles = 0; wiggles < WIGGLES; wiggles++) {
    const r = rng();
    if (!(r >= 0 && r < 1)) throw new RangeError(`rng must return a number in [0, 1), got ${r}`);
    if (r >= perWiggle) return { wiggles, caught: false };
  }
  return { wiggles: WIGGLES, caught: true };
}
