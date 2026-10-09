// Type chart and damage formula.
// Fire beats Leaf, Leaf beats Water, Water beats Fire. Normal moves are never
// super effective or weak.

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

/** Bonus when a creature uses a move of its own type. */
const SAME_TYPE_BONUS = 1.25;

export function effectiveness(moveType: MoveType, defenderType: CreatureType): Effectiveness {
  if (moveType === 'normal') return 'normal';
  if (BEATS[moveType] === defenderType) return 'super';
  if (BEATS[defenderType] === moveType) return 'weak';
  return 'normal';
}

export interface DamageInput {
  attacker: { level: number; attack: number; type: CreatureType };
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
  const sameType = move.type === attacker.type ? SAME_TYPE_BONUS : 1;
  const roll = 0.85 + 0.15 * rng();
  const damage = Math.max(1, Math.floor(base * sameType * MULTIPLIER[eff] * roll));
  return { damage, effectiveness: eff };
}
