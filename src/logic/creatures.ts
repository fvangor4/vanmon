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
  /** Map ids where it lives in the tall grass. Leave out to live everywhere. */
  areas?: string[];
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
export const MAX_LEVEL = 100;
/** Ids are lowercase words joined by dashes, e.g. "fire-kitty". */
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** Just a file name in public/creatures/, no folders. */
const IMAGE_PATTERN = /^[A-Za-z0-9_-]+\.(png|svg|jpe?g|webp)$/i;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function checkId(raw: Record<string, unknown>, label: string, problems: string[]): void {
  if (!isNonEmptyString(raw.id)) problems.push(`${label}: missing id`);
  else if (!ID_PATTERN.test(raw.id)) {
    problems.push(`${label}: id must be lowercase letters, numbers and dashes (like "fire-kitty")`);
  }
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
  checkId(raw, label, problems);
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
  movesById: Map<string, Record<string, unknown>>,
  problems: string[],
): void {
  if (!isRecord(raw)) {
    problems.push(`species #${index + 1} is not an object`);
    return;
  }
  const label = isNonEmptyString(raw.id) ? `species "${raw.id}"` : `species #${index + 1}`;
  checkId(raw, label, problems);
  if (!isNonEmptyString(raw.name)) problems.push(`${label}: missing name`);
  if (!(CREATURE_TYPES as readonly unknown[]).includes(raw.type)) {
    problems.push(`${label}: type must be one of ${CREATURE_TYPES.join(', ')}`);
  }
  if (!isNonEmptyString(raw.image)) problems.push(`${label}: missing image file name`);
  else if (!IMAGE_PATTERN.test(raw.image)) {
    problems.push(`${label}: image must be a file name like "fire-kitty.png" (png, svg, jpg or webp)`);
  }

  if (!isRecord(raw.baseStats)) {
    problems.push(`${label}: missing baseStats`);
  } else {
    for (const stat of ['hp', 'attack', 'defense'] as const) {
      if (!isIntInRange(raw.baseStats[stat], 1, MAX_BASE_STAT)) {
        problems.push(`${label}: baseStats.${stat} must be a whole number from 1 to ${MAX_BASE_STAT}`);
      }
    }
  }

  if (raw.areas !== undefined) {
    const ok = Array.isArray(raw.areas) && raw.areas.length > 0 && raw.areas.every((a) => typeof a === 'string' && ID_PATTERN.test(a));
    if (!ok) problems.push(`${label}: areas must be a list of map ids like ["route", "pond"]`);
  }

  if (!Array.isArray(raw.moves) || raw.moves.length !== 2) {
    problems.push(`${label}: must have exactly 2 moves`);
    return;
  }
  const known: Record<string, unknown>[] = [];
  for (const m of raw.moves) {
    if (typeof m !== 'string') problems.push(`${label}: moves must be move ids in quotes, like "bump"`);
    else if (!movesById.has(m)) problems.push(`${label}: unknown move "${m}"`);
    else known.push(movesById.get(m)!);
  }
  const typeIsValid = (CREATURE_TYPES as readonly unknown[]).includes(raw.type);
  if (known.length === 2 && typeIsValid) {
    const types = known.map((m) => m.type);
    if (!types.includes('normal') || !types.includes(raw.type)) {
      problems.push(`${label}: needs one normal move and one ${String(raw.type)} move`);
    }
  }
}

/** Duplicate ids. Missing ids are reported elsewhere, not here. */
function findDuplicates(ids: unknown[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const id of ids) {
    if (!isNonEmptyString(id)) continue;
    if (seen.has(id)) dupes.add(id);
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
  const movesById = new Map(
    moves.filter(isRecord).filter((m) => typeof m.id === 'string').map((m) => [m.id as string, m]),
  );
  species.forEach((s, i) => checkSpecies(s, i, movesById, problems));

  for (const id of findDuplicates(moves.filter(isRecord).map((m) => m.id))) {
    problems.push(`duplicate move id "${id}"`);
  }
  for (const id of findDuplicates(species.filter(isRecord).map((s) => s.id))) {
    problems.push(`duplicate species id "${id}"`);
  }

  if (problems.length > 0) throw new CreatureDataError(problems);
  return raw as unknown as CreatureData;
}

function assertLevel(level: number): void {
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) {
    throw new RangeError(`level must be a whole number from 1 to ${MAX_LEVEL}, got ${level}`);
  }
}

/** Stats for a species at a level. Level 5 with base 50 = 20 HP, 10 attack. */
export function statsAtLevel(base: BaseStats, level: number): Stats {
  assertLevel(level);
  return {
    maxHp: Math.floor((base.hp * level) / 50) + level + 10,
    attack: Math.floor((base.attack * level) / 50) + 5,
    defense: Math.floor((base.defense * level) / 50) + 5,
  };
}

/** Random id. crypto.randomUUID needs HTTPS and iOS 15.4+, so build one from getRandomValues. */
export function newUid(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function createCreature(species: SpeciesDef, level: number): Creature {
  const stats = statsAtLevel(species.baseStats, level);
  return {
    uid: newUid(),
    speciesId: species.id,
    level,
    xp: 0,
    hp: stats.maxHp,
    ...stats,
  };
}
