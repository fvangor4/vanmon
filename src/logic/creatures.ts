// Creature + move data model.
// All creatures live in public/data/creatures.json so new ones (like the kids'
// drawings) can be added without touching code. This module checks that file
// and turns species definitions into individual creatures.

export const CREATURE_TYPES = ['fire', 'water', 'leaf'] as const;
export const MOVE_TYPES = ['normal', ...CREATURE_TYPES] as const;

export type CreatureType = (typeof CREATURE_TYPES)[number];
export type MoveType = (typeof MOVE_TYPES)[number];

export interface MoveDef {
  id: string;
  name: string;
  type: MoveType;
  power: number;
}

export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
}

export interface SpeciesDef {
  id: string;
  name: string;
  type: CreatureType;
  /** File name inside public/creatures/ (png or svg). */
  image: string;
  baseStats: BaseStats;
  /** Exactly two move ids: a plain move and a type move. */
  moves: string[];
}

export interface CreatureData {
  moves: MoveDef[];
  species: SpeciesDef[];
}

export interface Stats {
  maxHp: number;
  attack: number;
  defense: number;
}

/** One individual creature the player (or the wild) has. */
export interface Creature extends Stats {
  uid: string;
  speciesId: string;
  level: number;
  xp: number;
  hp: number;
}

export class CreatureDataError extends Error {
  constructor(readonly problems: string[]) {
    super(`creatures.json has problems:\n- ${problems.join('\n- ')}`);
    this.name = 'CreatureDataError';
  }
}

const MAX_BASE_STAT = 255;
const MAX_POWER = 200;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isIntInRange(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

function checkMove(raw: unknown, index: number, problems: string[]): void {
  if (!isRecord(raw)) {
    problems.push(`move #${index + 1} is not an object`);
    return;
  }
  const label = isNonEmptyString(raw.id) ? `move "${raw.id}"` : `move #${index + 1}`;
  if (!isNonEmptyString(raw.id)) problems.push(`${label}: missing id`);
  if (!isNonEmptyString(raw.name)) problems.push(`${label}: missing name`);
  if (!(MOVE_TYPES as readonly unknown[]).includes(raw.type)) {
    problems.push(`${label}: type must be one of ${MOVE_TYPES.join(', ')}`);
  }
  if (!isIntInRange(raw.power, 1, MAX_POWER)) {
    problems.push(`${label}: power must be a whole number from 1 to ${MAX_POWER}`);
  }
}

function checkSpecies(
  raw: unknown,
  index: number,
  moveIds: Set<string>,
  problems: string[],
): void {
  if (!isRecord(raw)) {
    problems.push(`species #${index + 1} is not an object`);
    return;
  }
  const label = isNonEmptyString(raw.id) ? `species "${raw.id}"` : `species #${index + 1}`;
  if (!isNonEmptyString(raw.id)) problems.push(`${label}: missing id`);
  if (!isNonEmptyString(raw.name)) problems.push(`${label}: missing name`);
  if (!(CREATURE_TYPES as readonly unknown[]).includes(raw.type)) {
    problems.push(`${label}: type must be one of ${CREATURE_TYPES.join(', ')}`);
  }
  if (!isNonEmptyString(raw.image)) problems.push(`${label}: missing image file name`);

  if (!isRecord(raw.baseStats)) {
    problems.push(`${label}: missing baseStats`);
  } else {
    for (const stat of ['hp', 'attack', 'defense'] as const) {
      if (!isIntInRange(raw.baseStats[stat], 1, MAX_BASE_STAT)) {
        problems.push(`${label}: baseStats.${stat} must be a whole number from 1 to ${MAX_BASE_STAT}`);
      }
    }
  }

  if (!Array.isArray(raw.moves) || raw.moves.length !== 2) {
    problems.push(`${label}: must have exactly 2 moves`);
  } else {
    for (const m of raw.moves) {
      if (!moveIds.has(m as string)) problems.push(`${label}: unknown move "${String(m)}"`);
    }
  }
}

function findDuplicates(ids: unknown[]): string[] {
  const seen = new Set<unknown>();
  const dupes = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dupes.add(String(id));
    seen.add(id);
  }
  return [...dupes];
}

/** Checks raw JSON and returns it typed, or throws listing every problem found. */
export function validateCreatureData(raw: unknown): CreatureData {
  if (!isRecord(raw)) throw new CreatureDataError(['file must contain a JSON object']);
  const problems: string[] = [];

  const moves = Array.isArray(raw.moves) ? raw.moves : [];
  const species = Array.isArray(raw.species) ? raw.species : [];
  if (!Array.isArray(raw.moves)) problems.push('"moves" must be a list');
  if (!Array.isArray(raw.species) || species.length === 0) {
    problems.push('"species" must be a non-empty list');
  }

  moves.forEach((m, i) => checkMove(m, i, problems));
  const moveIds = new Set(moves.filter(isRecord).map((m) => m.id as string));
  species.forEach((s, i) => checkSpecies(s, i, moveIds, problems));

  for (const id of findDuplicates(moves.filter(isRecord).map((m) => m.id))) {
    problems.push(`duplicate move id "${id}"`);
  }
  for (const id of findDuplicates(species.filter(isRecord).map((s) => s.id))) {
    problems.push(`duplicate species id "${id}"`);
  }

  if (problems.length > 0) throw new CreatureDataError(problems);
  return raw as unknown as CreatureData;
}

/** Stats for a species at a level. Level 5 with base 50 ≈ 20 HP, 10 attack. */
export function statsAtLevel(base: BaseStats, level: number): Stats {
  return {
    maxHp: Math.floor((base.hp * level) / 50) + level + 10,
    attack: Math.floor((base.attack * level) / 50) + 5,
    defense: Math.floor((base.defense * level) / 50) + 5,
  };
}

export function createCreature(species: SpeciesDef, level: number): Creature {
  const stats = statsAtLevel(species.baseStats, level);
  return {
    uid: crypto.randomUUID(),
    speciesId: species.id,
    level,
    xp: 0,
    hp: stats.maxHp,
    ...stats,
  };
}
