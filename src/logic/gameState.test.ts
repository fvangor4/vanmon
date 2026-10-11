import { describe, expect, it } from 'vitest';
import { createCreature, type Creature, type CreatureData } from './creatures';
import { startBattle, type BattleState } from './battle';
import {
  addCaught,
  applyBattleOutcome,
  depositToBox,
  healAll,
  markSeen,
  newGame,
  PARTY_MAX,
  setLead,
  withdrawFromBox,
  type GameState,
} from './gameState';
import { START } from '../data/maps';
import { xpForWin } from './xp';

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
const mon = (id: string, level = 5, hp?: number): Creature => {
  const c = createCreature(sp(id), level);
  return hp === undefined ? c : { ...c, hp };
};
const withParty = (party: Creature[], box: Creature[] = []): GameState => ({
  ...newGame(party[0]),
  party,
  box,
  book: Object.fromEntries([...party, ...box].map((c) => [c.speciesId, 'caught' as const])),
});

describe('newGame', () => {
  it('starts at the start spot with the starter in the party and in the Book as caught', () => {
    const starter = mon('firey');
    const g = newGame(starter);
    expect(g.party).toEqual([starter]);
    expect(g.box).toEqual([]);
    expect(g.book).toEqual({ firey: 'caught' });
    expect(g.position).toEqual(START);
    expect(g.npcsBeaten).toEqual([]);
  });
});

describe('markSeen', () => {
  it('records a newly seen species but never downgrades a caught one', () => {
    const g = newGame(mon('firey'));
    expect(markSeen(g, 'watery').book).toEqual({ firey: 'caught', watery: 'seen' });
    expect(markSeen(g, 'firey').book.firey).toBe('caught');
  });
});

describe('addCaught', () => {
  it('adds to the party while there is room and marks the Book', () => {
    const g = newGame(mon('firey'));
    const caught = mon('watery', 4, 3);
    const { state, where } = addCaught(g, caught);
    expect(where).toBe('party');
    expect(state.party.at(-1)).toEqual(caught);
    expect(state.book.watery).toBe('caught');
  });

  it(`sends the catch to the Box when the party already has ${PARTY_MAX}`, () => {
    const g = withParty(Array.from({ length: PARTY_MAX }, () => mon('firey')));
    const { state, where } = addCaught(g, mon('watery'));
    expect(where).toBe('box');
    expect(state.party).toHaveLength(PARTY_MAX);
    expect(state.box).toHaveLength(1);
  });
});

describe('healAll', () => {
  it('restores every creature in the party and the Box to full HP', () => {
    const g = withParty([mon('firey', 5, 0), mon('watery', 5, 3)], [mon('watery', 5, 1)]);
    const h = healAll(g);
    for (const c of [...h.party, ...h.box]) expect(c.hp).toBe(c.maxHp);
  });
});

describe('party and Box', () => {
  it('setLead moves a party creature to the front', () => {
    const a = mon('firey');
    const b = mon('watery');
    expect(setLead(withParty([a, b]), 1).party).toEqual([b, a]);
  });

  it('deposit moves a creature to the Box but always keeps one in the party', () => {
    const a = mon('firey');
    const b = mon('watery');
    const g = depositToBox(withParty([a, b]), 0);
    expect(g.party).toEqual([b]);
    expect(g.box).toEqual([a]);
    expect(() => depositToBox(g, 0)).toThrow();
  });

  it(`withdraw moves a Box creature into the party, up to ${PARTY_MAX}`, () => {
    const boxed = mon('watery');
    const g = withdrawFromBox(withParty([mon('firey')], [boxed]), 0);
    expect(g.party.at(-1)).toEqual(boxed);
    expect(g.box).toEqual([]);
    const full = withParty(Array.from({ length: PARTY_MAX }, () => mon('firey')), [boxed]);
    expect(() => withdrawFromBox(full, 0)).toThrow();
  });

  it('rejects bad slot numbers', () => {
    const g = withParty([mon('firey'), mon('watery')], [mon('watery')]);
    for (const bad of [3, -1, 0.5, Number.NaN]) {
      expect(() => setLead(g, bad)).toThrow(/slot/);
      expect(() => depositToBox(g, bad)).toThrow(/slot/);
      expect(() => withdrawFromBox(g, bad === 3 ? 1 : bad)).toThrow(/slot/);
    }
  });
});

describe('applyBattleOutcome', () => {
  const finished = (g: GameState, wild: Creature, patch: Partial<BattleState>): BattleState => ({
    ...startBattle(g.party, { ...wild, hp: wild.maxHp }),
    wild,
    ...patch,
  });

  it('won: keeps HP from the battle, marks the wild species seen, and gives XP to the creature that fought', () => {
    const g = withParty([mon('firey'), mon('firey')]);
    const wild = mon('watery', 5, 0);
    const b = finished(g, wild, { activeIndex: 1, outcome: 'won', wild });
    b.party[1] = { ...b.party[1], hp: 7 };
    const { state, levelUps } = applyBattleOutcome(g, b, data);
    expect(state.party[1].hp).toBe(7);
    expect(state.party[1].xp).toBe(xpForWin(5));
    expect(state.party[0].xp).toBe(0);
    expect(state.book.watery).toBe('seen');
    expect(levelUps).toEqual([]);
  });

  it('won: reports level-ups for the celebration', () => {
    const g = withParty([{ ...mon('firey'), xp: 49 }]);
    const wild = mon('watery', 5, 0);
    const { state, levelUps } = applyBattleOutcome(g, finished(g, wild, { outcome: 'won', wild }), data);
    expect(levelUps).toEqual([6]);
    expect(state.party[0].level).toBe(6);
  });

  it('caught: keeps HP from the battle and adds the wild creature to the collection', () => {
    const g = withParty([mon('firey')]);
    const wild = mon('watery', 3, 2);
    const b = finished(g, wild, { outcome: 'caught', wild });
    b.party[0] = { ...b.party[0], hp: 6 };
    const { state } = applyBattleOutcome(g, b, data);
    expect(state.party[0].hp).toBe(6);
    expect(state.party).toHaveLength(2);
    expect(state.party[1]).toEqual(wild);
    expect(state.book.watery).toBe('caught');
  });

  it('ran: keeps HP from the battle and marks the species seen', () => {
    const g = withParty([mon('firey')]);
    const wild = mon('watery');
    const b = finished(g, wild, { outcome: 'ran' });
    b.party[0] = { ...b.party[0], hp: 5 };
    const { state } = applyBattleOutcome(g, b, data);
    expect(state.party[0].hp).toBe(5);
    expect(state.book.watery).toBe('seen');
  });

  it('lost: "your creatures got sleepy" — home, everyone fully healed, nothing lost', () => {
    const g = { ...withParty([mon('firey'), mon('watery')], [mon('watery', 5, 2)]), position: { map: 'route', x: 3, y: 3 } };
    const b = finished(g, mon('watery'), { outcome: 'lost' });
    b.party[0] = { ...b.party[0], hp: 0 };
    const { state } = applyBattleOutcome(g, b, data);
    expect(state.position).toEqual(START);
    for (const c of [...state.party, ...state.box]) expect(c.hp).toBe(c.maxHp);
    expect(state.party.map((c) => c.uid)).toEqual(g.party.map((c) => c.uid));
    expect(state.box.map((c) => c.uid)).toEqual(g.box.map((c) => c.uid));
    expect(state.book).toEqual(g.book); // watery was already caught; nothing lost
  });

  it('lost: a newly met species is still remembered as seen', () => {
    const g = withParty([mon('firey')]);
    const b = finished(g, mon('watery'), { outcome: 'lost' });
    expect(applyBattleOutcome(g, b, data).state.book).toEqual({ firey: 'caught', watery: 'seen' });
  });

  it('refuses a battle result for a different party, or with a bad active slot', () => {
    const g = withParty([mon('firey'), mon('watery')]);
    const b = finished(g, mon('watery'), { outcome: 'ran' });
    expect(() => applyBattleOutcome(depositToBox(g, 1), b, data)).toThrow(/different party/);
    expect(() => applyBattleOutcome(g, { ...b, activeIndex: 4 }, data)).toThrow(/slot/);
  });

  it('refuses a battle that has not finished', () => {
    const g = withParty([mon('firey')]);
    expect(() => applyBattleOutcome(g, startBattle(g.party, mon('watery')), data)).toThrow();
  });

  it('does not change the state passed in, for any outcome', () => {
    for (const outcome of ['won', 'caught', 'ran', 'lost'] as const) {
      const g = withParty([{ ...mon('firey'), xp: 49 }]);
      const before = structuredClone(g);
      const wild = mon('watery', 3, outcome === 'won' ? 0 : 2);
      applyBattleOutcome(g, finished(g, wild, { outcome, wild }), data);
      expect(g, outcome).toEqual(before);
    }
  });
});
