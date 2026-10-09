// Saving and loading the game on this iPad (localStorage).
// A save must never crash the game: damaged saves start a fresh game and keep
// the bad data under BACKUP_KEY, and saves made before a parent edited
// creatures.json are repaired to match the current creatures.

import { MAX_LEVEL, newUid, statsAtLevel, type Creature, type CreatureData, type SpeciesDef } from './creatures';
import type { BookEntry, GameState, Position } from './gameState';
import { parseMap, type MapDef } from './map';
import { LEVEL_CAP, xpToNextLevel } from './xp';
import { MAPS, START } from '../data/maps';

export const SAVE_KEY = 'vanmon.save';
export const BACKUP_KEY = 'vanmon.save.backup';
export const SAVE_VERSION = 1;

/** The bits of localStorage we use, so tests can pass a fake. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface SaveFile {
  version: number;
  savedAt: string;
  state: GameState;
}

export interface LoadResult {
  state: GameState | null;
  /** Why a save couldn't be used (for the console; kids never see it). */
  problem?: string;
}

/** Returns false (instead of throwing) if the iPad won't store it. */
export function saveGame(store: KeyValueStore, state: GameState): boolean {
  const file: SaveFile = { version: SAVE_VERSION, savedAt: new Date().toISOString(), state };
  try {
    store.setItem(SAVE_KEY, JSON.stringify(file));
    return true;
  } catch {
    return false;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function backup(store: KeyValueStore, raw: string, problem: string, dropped: unknown[] = []): void {
  try {
    store.setItem(BACKUP_KEY, JSON.stringify({ at: new Date().toISOString(), problem, raw, dropped }));
  } catch {
    // Nowhere left to keep it; the game still starts.
  }
}

/** A saved creature made to fit today's creatures.json, or null if it can't be. */
function repairCreature(raw: unknown, species: Map<string, SpeciesDef>, seenUids: Set<string>): Creature | null {
  if (!isRecord(raw)) return null;
  const sp = species.get(raw.speciesId as string);
  const level = raw.level;
  if (!sp || typeof level !== 'number' || !Number.isInteger(level) || level < 1 || level > Math.min(LEVEL_CAP, MAX_LEVEL)) {
    return null;
  }
  const stats = statsAtLevel(sp.baseStats, level);
  const maxXp = level >= LEVEL_CAP ? 0 : xpToNextLevel(level) - 1;
  const xp = typeof raw.xp === 'number' && Number.isFinite(raw.xp) ? Math.round(raw.xp) : 0;
  const hp = typeof raw.hp === 'number' && Number.isFinite(raw.hp) ? Math.round(raw.hp) : stats.maxHp;
  let uid = typeof raw.uid === 'string' && raw.uid.length > 0 ? raw.uid : newUid();
  if (seenUids.has(uid)) uid = newUid();
  seenUids.add(uid);
  return {
    uid,
    speciesId: sp.id,
    level,
    xp: Math.min(maxXp, Math.max(0, xp)),
    hp: Math.min(stats.maxHp, Math.max(0, hp)),
    ...stats,
  };
}

function repairPosition(raw: unknown, maps: Record<string, MapDef>): Position {
  if (isRecord(raw) && typeof raw.map === 'string' && maps[raw.map]) {
    const { x, y } = raw;
    if (typeof x === 'number' && typeof y === 'number' && parseMap(maps[raw.map]).isWalkable(x, y)) {
      // isWalkable is false for fractional coordinates (no such tile).
      return { map: raw.map, x, y };
    }
  }
  return { ...START };
}

export function loadGame(
  store: KeyValueStore,
  data: CreatureData,
  maps: Record<string, MapDef> = MAPS,
): LoadResult {
  let raw: string | null;
  try {
    raw = store.getItem(SAVE_KEY);
  } catch (err) {
    return { state: null, problem: `could not read storage: ${String(err)}` };
  }
  if (raw === null) return { state: null };

  const fail = (problem: string, dropped: unknown[] = []): LoadResult => {
    backup(store, raw!, problem, dropped);
    return { state: null, problem };
  };

  let file: unknown;
  try {
    file = JSON.parse(raw);
  } catch {
    return fail('save is not valid JSON');
  }
  if (!isRecord(file)) return fail('save is not an object');
  if (file.version !== SAVE_VERSION) return fail(`unknown save version ${String(file.version)}`);
  const s = file.state;
  if (!isRecord(s) || !Array.isArray(s.party) || !Array.isArray(s.box)) return fail('save has no party/box');

  const species = new Map(data.species.map((sp) => [sp.id, sp]));
  const seenUids = new Set<string>();
  const dropped: unknown[] = [];
  const keep = (list: unknown[]) =>
    list.flatMap((c) => {
      const fixed = repairCreature(c, species, seenUids);
      if (!fixed) dropped.push(c);
      return fixed ? [fixed] : [];
    });
  const party = keep(s.party);
  const box = keep(s.box);
  if (party.length === 0 && box.length > 0) party.push(box.shift()!);
  if (party.length === 0) return fail('no creatures left after repair', dropped);

  const book: Record<string, BookEntry> = {};
  if (isRecord(s.book)) {
    for (const [id, entry] of Object.entries(s.book)) {
      if (species.has(id) && (entry === 'seen' || entry === 'caught')) book[id] = entry;
    }
  }
  for (const c of [...party, ...box]) book[c.speciesId] = 'caught';

  if (dropped.length > 0) backup(store, raw, 'some creatures could not be loaded', dropped);
  return { state: { party, box, book, position: repairPosition(s.position, maps) } };
}

/** Asks Safari not to clear the save when space is low. Never throws. */
export async function requestPersistentStorage(
  nav: { storage?: { persist?: () => Promise<boolean> } } = navigator,
): Promise<boolean> {
  try {
    return (await nav.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
