// Type chart and damage formula.
// Fire beats Leaf, Leaf beats Water, Water beats Fire. Normal moves are never
// super effective or weak. No same-type bonus: for 5- and 7-year-olds the only
// rule that matters is "pick the move that beats their color".

import type { CreatureType, MoveType } from './creatures';

export type Effectiveness = 'super' | 'normal' | 'weak';

/** Random number in [0, 1). Injected so tests (and replays) are predictable. */
export type Rng = () => number;

const BEATS: Record<CreatureType, CreatureType> = {
  fire: 'leaf',
  leaf: 'water',
  water: 'fire',
};

const MULTIPLIER: Record<Effectiveness, number> = { super: 2, normal: 1, weak: 0.5 };

export function effectiveness(moveType: MoveType, defenderType: CreatureType): Effectiveness {
  if (moveType === 'normal') return 'normal';
  if (BEATS[moveType] === defenderType) return 'super';
  if (BEATS[defenderType] === moveType) return 'weak';
  return 'normal';
}

/** What a move button should flag against this opponent: null when it's a plain matchup. */
export function moveHint(moveType: MoveType, defenderType: CreatureType): 'super' | 'weak' | null {
  const eff = effectiveness(moveType, defenderType);
  return eff === 'normal' ? null : eff;
}

export interface DamageInput {
  attacker: { level: number; attack: number };
  defender: { defense: number; type: CreatureType };
  move: { type: MoveType; power: number };
  rng: Rng;
}

export interface DamageResult {
  damage: number;
  effectiveness: Effectiveness;
}

export function calcDamage({ attacker, defender, move, rng }: DamageInput): DamageResult {
  const eff = effectiveness(move.type, defender.type);
  const base = (((2 * attacker.level) / 5 + 2) * move.power * (attacker.attack / defender.defense)) / 50 + 2;
  const r = rng();
  if (!(r >= 0 && r < 1)) throw new RangeError(`rng must return a number in [0, 1), got ${r}`);
  const roll = 0.85 + 0.15 * r;
  const damage = Math.max(1, Math.floor(base * MULTIPLIER[eff] * roll));
  return { damage, effectiveness: eff };
}
