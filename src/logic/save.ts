// Saving and loading the game on this iPad (localStorage).
// A save must never crash the game: damaged saves start a fresh game and keep
// the bad data under BACKUP_KEY, and saves made before a parent edited
// creatures.json are repaired to match the current creatures.

import { MAX_LEVEL, newUid, statsAtLevel, type Creature, type CreatureData, type SpeciesDef } from './creatures';
import { PARTY_MAX, type BookEntry, type GameState, type Position } from './gameState';
import { parseMap, type MapDef } from './map';
import { LEVEL_CAP, xpToNextLevel } from './xp';
import { MAPS, START } from '../data/maps';

export const SAVE_KEY = 'vanmon.save';
export const BACKUP_KEY = 'vanmon.save.backup';
export const SAVE_VERSION = 2;
/** How many past problem saves to keep in BACKUP_KEY. */
const MAX_BACKUPS = 5;

/**
 * Upgrades from older save versions: MIGRATIONS[n] turns a version-n `state`
 * into version n+1.
 */
export type Migrations = Record<number, (state: unknown) => unknown>;
export const MIGRATIONS: Migrations = {
  // 1 → 2: NPCs arrived (the Gold Kid). Nobody has beaten one yet.
  1: (state) => (isRecord(state) ? { ...state, npcsBeaten: [] } : state),
};

/** The bits of localStorage we use, so tests can pass a fake. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * The browser's localStorage, or an in-memory stand-in when Safari blocks it
 * (just touching window.localStorage can throw). The game still plays; it
 * just can't remember progress.
 */
export function browserStore(get: () => KeyValueStore = () => localStorage): KeyValueStore {
  try {
    const store = get();
    if (store) return store;
  } catch {
    // fall through to memory
  }
  const items = new Map<string, string>();
  return {
    getItem: (k) => items.get(k) ?? null,
    setItem: (k, v) => void items.set(k, v),
    removeItem: (k) => void items.delete(k),
  };
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
  /**
   * The save is from a newer version of the game (an old cached copy is
   * running). Play a fresh game but don't save over it; a reload with the
   * updated game will load it normally.
   */
  protectSave?: boolean;
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

export interface BackupEntry {
  at: string;
  problem: string;
  raw: string;
  dropped: unknown[];
}

/** Past problem saves, newest last. */
export function readBackups(store: KeyValueStore): BackupEntry[] {
  try {
    const parsed: unknown = JSON.parse(store.getItem(BACKUP_KEY) ?? '[]');
    const list = Array.isArray(parsed) ? parsed : [parsed]; // early builds stored a single entry
    return list.flatMap((b) =>
      isRecord(b) && typeof b.raw === 'string' && typeof b.problem === 'string'
        ? [{ at: typeof b.at === 'string' ? b.at : '', problem: b.problem, raw: b.raw, dropped: Array.isArray(b.dropped) ? b.dropped : [] }]
        : [],
    );
  } catch {
    return [];
  }
}

function backup(store: KeyValueStore, raw: string, problem: string, dropped: unknown[] = []): void {
  try {
    // Keep a short history so a later problem never erases an earlier one.
    const list = readBackups(store).filter((b) => b.raw !== raw || b.problem !== problem);
    list.push({ at: new Date().toISOString(), problem, raw, dropped });
    store.setItem(BACKUP_KEY, JSON.stringify(list.slice(-MAX_BACKUPS)));
  } catch {
    // Storage is full or blocked: nowhere to keep it, but the game still starts.
  }
}

/** Copies the current save into the backup history (e.g. before New Game replaces it). */
export function backupCurrentSave(store: KeyValueStore, reason: string): void {
  let raw: string | null = null;
  try {
    raw = store.getItem(SAVE_KEY);
  } catch {
    return;
  }
  if (raw !== null) backup(store, raw, reason);
}

/** A saved creature made to fit today's creatures.json, or null if it can't be. */
function repairCreature(raw: unknown, species: Map<string, SpeciesDef>, seenUids: Set<string>): Creature | null {
  if (!isRecord(raw)) return null;
  const sp = species.get(raw.speciesId as string);
  if (!sp || typeof raw.level !== 'number' || !Number.isInteger(raw.level) || raw.level < 1 || raw.level > MAX_LEVEL) {
    return null;
  }
  // Above this version's cap (e.g. the cap was lowered): keep the creature, at the cap.
  const level = Math.min(raw.level, LEVEL_CAP);
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

function repairPosition(raw: unknown, maps: Record<string, MapDef>, problems: string[]): Position {
  if (isRecord(raw) && typeof raw.map === 'string' && Object.hasOwn(maps, raw.map)) {
    const { x, y } = raw;
    let map;
    try {
      map = parseMap(maps[raw.map]);
    } catch (err) {
      // A broken map shipped in an update shouldn't cost anyone their creatures.
      problems.push(`map "${raw.map}" is broken, starting at home: ${String(err)}`);
      return { ...START };
    }
    // isWalkable is false for fractional coordinates (no such tile). Never
    // resume standing on an exit, or loading would bounce you to another map.
    if (typeof x === 'number' && typeof y === 'number' && map.isWalkable(x, y) && !map.warpAt(x, y)) {
      return { map: raw.map, x, y };
    }
  }
  return { ...START };
}

export interface LoadOptions {
  maps?: Record<string, MapDef>;
  /** For tests: pretend the game's save version and upgrades are these. */
  version?: number;
  migrations?: Migrations;
}

export function loadGame(store: KeyValueStore, data: CreatureData, opts: LoadOptions = {}): LoadResult {
  const { maps = MAPS, version: currentVersion = SAVE_VERSION, migrations = MIGRATIONS } = opts;
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
  let version = file.version;
  let s = file.state;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return fail(`unknown save version ${String(version)}`);
  }
  if (version > currentVersion) {
    return { ...fail(`save is from a newer version (${version})`), protectSave: true };
  }

  // A missing or crashing upgrade is a bug in the game, not a bad save: keep the
  // save safe from autosave so a fixed update can still load it.
  const protect = (problem: string): LoadResult => ({ ...fail(problem), protectSave: true });
  for (; version < currentVersion; version++) {
    const migrate = migrations[version];
    if (!migrate) return protect(`no way to upgrade a version ${version} save`);
    try {
      s = migrate(s);
    } catch (err) {
      return protect(`upgrading a version ${version} save failed: ${String(err)}`);
    }
  }

  try {
    return repairState(store, raw, s, data, maps, fail);
  } catch (err) {
    // Last resort: a save must never crash the game.
    return fail(`could not load save: ${String(err)}`);
  }
}

function repairState(
  store: KeyValueStore,
  raw: string,
  s: unknown,
  data: CreatureData,
  maps: Record<string, MapDef>,
  fail: (problem: string, dropped?: unknown[]) => LoadResult,
): LoadResult {
  if (!isRecord(s) || !Array.isArray(s.party)) return fail('save has no party');

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
  const box = keep(Array.isArray(s.box) ? s.box : []);
  if (party.length === 0 && box.length > 0) party.push(box.shift()!);
  if (party.length > PARTY_MAX) box.unshift(...party.splice(PARTY_MAX));
  if (party.length === 0) return fail('no creatures left after repair', dropped);

  const book: Record<string, BookEntry> = {};
  if (isRecord(s.book)) {
    for (const [id, entry] of Object.entries(s.book)) {
      if (species.has(id) && (entry === 'seen' || entry === 'caught')) book[id] = entry;
    }
  }
  for (const c of [...party, ...box]) book[c.speciesId] = 'caught';

  if (dropped.length > 0) backup(store, raw, 'some creatures could not be loaded', dropped);
  const problems: string[] = [];
  const position = repairPosition(s.position, maps, problems);
  const npcsBeaten = Array.isArray(s.npcsBeaten)
    ? [...new Set(s.npcsBeaten.filter((id): id is string => typeof id === 'string' && id.length > 0))]
    : [];
  const result: LoadResult = { state: { party, box, book, position, npcsBeaten } };
  if (problems.length > 0) result.problem = problems.join('; ');
  return result;
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
