import { describe, expect, it, vi } from 'vitest';
import { createCreature, statsAtLevel, type Creature, type CreatureData } from './creatures';
import { newGame, type GameState } from './gameState';
import { loadGame, readBackups, requestPersistentStorage, SAVE_KEY, SAVE_VERSION, saveGame, type KeyValueStore } from './save';
import { PARTY_MAX } from './gameState';
import { START } from '../data/maps';
import { LEVEL_CAP, xpToNextLevel } from './xp';

const data: CreatureData = {
  moves: [
    { id: 'bump', name: 'Bump', type: 'normal', power: 35 },
    { id: 'spark', name: 'Spark', type: 'fire', power: 45 },
    { id: 'splash', name: 'Splash', type: 'water', power: 45 },
  ],
  species: [
    { id: 'firey', name: 'Firey', type: 'fire', image: 'f.svg', baseStats: { hp: 50, attack: 50, defense: 50 }, moves: ['bump', 'spark'] },
    { id: 'watery', name: 'Watery', type: 'water', image: 'w.svg', baseStats: { hp: 50, attack: 50, defense: 50 }, moves: ['bump', 'splash'] },
  ],
};
const sp = (id: string) => data.species.find((s) => s.id === id)!;
const mon = (id: string, level = 5): Creature => createCreature(sp(id), level);

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { items: Record<string, string> } {
  const items = { ...initial };
  return {
    items,
    getItem: (k) => (k in items ? items[k] : null),
    setItem: (k, v) => void (items[k] = v),
    removeItem: (k) => void delete items[k],
  };
}

function game(): GameState {
  const g = newGame(mon('firey'));
  return { ...g, party: [...g.party, { ...mon('watery', 3), hp: 4, xp: 7 }], box: [mon('watery', 2)], book: { firey: 'caught', watery: 'caught' } };
}

/** Saves `state`, then lets `edit` tamper with the stored JSON. */
function storedWith(edit: (file: any) => void, state = game()) {
  const store = memoryStore();
  saveGame(store, state);
  const file = JSON.parse(store.items[SAVE_KEY]);
  edit(file);
  store.items[SAVE_KEY] = JSON.stringify(file);
  return store;
}

describe('save and load', () => {
  it('round-trips a game exactly', () => {
    const store = memoryStore();
    const g = game();
    expect(saveGame(store, g)).toBe(true);
    expect(loadGame(store, data)).toEqual({ state: g });
  });

  it('writes a versioned file', () => {
    const store = memoryStore();
    saveGame(store, game());
    expect(JSON.parse(store.items[SAVE_KEY]).version).toBe(SAVE_VERSION);
  });

  it('returns no game when nothing is saved', () => {
    expect(loadGame(memoryStore(), data)).toEqual({ state: null });
  });
});

describe('damaged saves start fresh and keep the bad data in a backup', () => {
  for (const [label, raw] of [
    ['not JSON', '{oops'],
    ['newer version', JSON.stringify({ version: SAVE_VERSION + 1, state: {} })],
    ['nonsense version', JSON.stringify({ version: 'one', state: {} })],
    ['older version with no upgrade path', JSON.stringify({ version: 0, state: {} })],
    ['missing state', JSON.stringify({ version: SAVE_VERSION })],
    ['party not a list', JSON.stringify({ version: SAVE_VERSION, state: { party: 'x', box: [], book: {}, position: START } })],
    ['JSON null', 'null'],
    ['JSON array', '[]'],
    ['JSON string', '"save"'],
    ['JSON number', '5'],
  ] as const) {
    it(label, () => {
      const store = memoryStore({ [SAVE_KEY]: raw });
      const result = loadGame(store, data);
      expect(result.state).toBeNull();
      expect(result.problem).toBeTruthy();
      expect(readBackups(store).at(-1)!.raw).toBe(raw);
    });
  }

  it('never crashes on a position naming a built-in object key', () => {
    for (const map of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      const store = storedWith((f) => { f.state.position = { map, x: 1, y: 1 }; });
      expect(loadGame(store, data).state!.position, map).toEqual(START);
    }
  });

  it('keeps earlier backups when a later problem happens', () => {
    const store = memoryStore({ [SAVE_KEY]: '{oops' });
    loadGame(store, data);
    saveGame(store, game());
    const tampered = JSON.parse(store.items[SAVE_KEY]);
    tampered.state.party[1].speciesId = 'deleted-mon';
    store.items[SAVE_KEY] = JSON.stringify(tampered);
    loadGame(store, data);
    expect(readBackups(store).map((b) => b.raw)).toContain('{oops');
    expect(readBackups(store)).toHaveLength(2);
  });

  it('still starts when even the backup cannot be written', () => {
    const store: KeyValueStore = { getItem: (k) => (k === SAVE_KEY ? '{oops' : null), setItem: () => { throw new Error('QuotaExceededError'); }, removeItem: () => {} };
    expect(loadGame(store, data)).toEqual({ state: null, problem: 'save is not valid JSON' });
  });

  it('an empty party after cleanup counts as damaged', () => {
    const store = storedWith((f) => { f.state.party = []; f.state.box = []; });
    expect(loadGame(store, data).state).toBeNull();
    expect(readBackups(store)).toHaveLength(1);
  });
});

describe('repairs that keep the game going', () => {
  it('drops creatures whose species no longer exists, and records them in the backup', () => {
    const store = storedWith((f) => { f.state.party[1].speciesId = 'deleted-mon'; });
    const { state } = loadGame(store, data);
    expect(state!.party).toHaveLength(1);
    expect((readBackups(store).at(-1)!.dropped[0] as any).speciesId).toBe('deleted-mon');
  });

  it('moves a Box creature into an emptied party', () => {
    const store = storedWith((f) => { f.state.party = [{ ...f.state.party[0], speciesId: 'gone' }]; });
    const { state } = loadGame(store, data);
    expect(state!.party).toHaveLength(1);
    expect(state!.party[0].speciesId).toBe('watery');
    expect(state!.box).toHaveLength(0);
  });

  it('recomputes stats when a parent has since edited base stats in creatures.json', () => {
    const store = memoryStore();
    const saved = game();
    saveGame(store, saved);
    const edited: CreatureData = {
      ...data,
      species: data.species.map((s) => (s.id === 'firey' ? { ...s, baseStats: { hp: 80, attack: 90, defense: 30 } } : s)),
    };
    const c = loadGame(store, edited).state!.party[0];
    expect(c).toMatchObject(statsAtLevel({ hp: 80, attack: 90, defense: 30 }, c.level));
    expect(c.maxHp).toBeGreaterThan(saved.party[0].maxHp);
    expect(c.hp).toBe(saved.party[0].hp); // HP carried over (still within the new max)
  });

  it('clamps tampered stats and HP back to what the species allows', () => {
    const store = storedWith((f) => { f.state.party[0].attack = 999; f.state.party[0].maxHp = 999; f.state.party[0].hp = 999; });
    const c = loadGame(store, data).state!.party[0];
    expect(c).toMatchObject(statsAtLevel(sp('firey').baseStats, c.level));
    expect(c.hp).toBe(c.maxHp);
  });

  it('keeps a creature above the level cap, at the cap', () => {
    const store = storedWith((f) => { f.state.party[1].level = LEVEL_CAP + 5; });
    expect(loadGame(store, data).state!.party[1].level).toBe(LEVEL_CAP);
  });

  it('rounds or resets XP and HP that are not whole numbers', () => {
    const store = storedWith((f) => {
      f.state.party[1].xp = 3.6;
      f.state.party[1].hp = 'lots';
      f.state.box[0].xp = 'five';
      f.state.box[0].hp = 2.4;
    });
    const { state } = loadGame(store, data);
    expect(state!.party[1].xp).toBe(4);
    expect(state!.party[1].hp).toBe(state!.party[1].maxHp);
    expect(state!.box[0].xp).toBe(0);
    expect(state!.box[0].hp).toBe(2);
  });

  it('moves extra party creatures past the limit into the Box', () => {
    const big = { ...game(), party: Array.from({ length: PARTY_MAX + 2 }, () => mon('firey')) };
    const store = memoryStore();
    saveGame(store, big);
    const { state } = loadGame(store, data);
    expect(state!.party).toHaveLength(PARTY_MAX);
    expect(state!.box).toHaveLength(big.box.length + 2);
  });

  it('treats a missing Box as empty instead of throwing the save away', () => {
    const store = storedWith((f) => { delete f.state.box; });
    const { state } = loadGame(store, data);
    expect(state!.party).toHaveLength(2);
    expect(state!.box).toEqual([]);
  });

  it('drops creatures with a broken level; clamps broken XP and HP', () => {
    for (const bad of [0, 2.5, 101, 'five']) {
      const store = storedWith((f) => { f.state.party[1].level = bad; });
      expect(loadGame(store, data).state!.party, `level ${bad}`).toHaveLength(1);
    }
    const store = storedWith((f) => {
      f.state.party[0].xp = 10_000;
      f.state.party[1].xp = -4;
      f.state.party[1].hp = -3;
    });
    const { state } = loadGame(store, data);
    expect(state!.party[0].xp).toBe(xpToNextLevel(5) - 1);
    expect(state!.party[1].xp).toBe(0);
    expect(state!.party[1].hp).toBe(0);
  });

  it('keeps XP at 0 for creatures at the level cap', () => {
    const capped = { ...mon('firey', LEVEL_CAP), xp: 0 };
    const store = storedWith((f) => { f.state.party[0] = { ...capped, xp: 30 }; });
    expect(loadGame(store, data).state!.party[0].xp).toBe(0);
  });

  it('gives creatures with missing or repeated ids fresh ones', () => {
    const store = storedWith((f) => { f.state.party[1].uid = f.state.party[0].uid; delete f.state.box[0].uid; });
    const { state } = loadGame(store, data);
    const uids = [...state!.party, ...state!.box].map((c) => c.uid);
    expect(new Set(uids).size).toBe(3);
    for (const u of uids) expect(typeof u).toBe('string');
  });

  it('keeps a valid spot away from the start', () => {
    const pos = { map: 'route', x: 5, y: 5 };
    const store = memoryStore();
    saveGame(store, { ...game(), position: pos });
    expect(loadGame(store, data).state!.position).toEqual(pos);
  });

  it('puts the player back at the start if their spot no longer exists, is blocked, or is an exit', () => {
    for (const pos of [{ map: 'moon', x: 1, y: 1 }, { map: 'town', x: 0, y: 0 }, { map: 'town', x: 7.5, y: 5 }, { map: 'town', x: 9, y: 0 }, null]) {
      const store = storedWith((f) => { f.state.position = pos; });
      expect(loadGame(store, data).state!.position).toEqual(START);
    }
  });

  it('keeps only valid Book entries, and every creature you own counts as caught', () => {
    const store = storedWith((f) => { f.state.book = { firey: 'seen', ghost: 'caught', watery: 'banana' }; });
    expect(loadGame(store, data).state!.book).toEqual({ firey: 'caught', watery: 'caught' });
  });
});

describe('storage that misbehaves (private browsing, full disk)', () => {
  it('treats unreadable storage as no save', () => {
    const store: KeyValueStore = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => {}, removeItem: () => {} };
    expect(loadGame(store, data)).toEqual({ state: null, problem: 'could not read storage: Error: SecurityError' });
  });

  it('reports a failed save instead of crashing', () => {
    const store: KeyValueStore = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); }, removeItem: () => {} };
    expect(saveGame(store, game())).toBe(false);
  });
});

describe('requestPersistentStorage', () => {
  it('asks the browser to keep the save, when it can', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    expect(await requestPersistentStorage({ storage: { persist } })).toBe(true);
    expect(persist).toHaveBeenCalledOnce();
  });

  it('is fine when the browser cannot', async () => {
    expect(await requestPersistentStorage({})).toBe(false);
    expect(await requestPersistentStorage({ storage: { persist: () => Promise.reject(new Error('no')) } })).toBe(false);
  });
});
