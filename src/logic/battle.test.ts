import { describe, expect, it } from 'vitest';
import { createCreature, type Creature, type CreatureData } from './creatures';
import { makeBattleContext, startBattle, takeTurn, WILD_DAMAGE_SCALE, type BattleState } from './battle';

const data: CreatureData = {
  moves: [
    { id: 'bump', name: 'Bump', type: 'normal', power: 35 },
    { id: 'spark', name: 'Spark', type: 'fire', power: 45 },
    { id: 'splash', name: 'Splash', type: 'water', power: 45 },
    { id: 'leafy', name: 'Leafy', type: 'leaf', power: 45 },
  ],
  species: [
    { id: 'firey', name: 'Firey', type: 'fire', image: 'f.svg', baseStats: { hp: 50, attack: 50, defense: 50 }, moves: ['bump', 'spark'] },
    { id: 'watery', name: 'Watery', type: 'water', image: 'w.svg', baseStats: { hp: 50, attack: 50, defense: 50 }, moves: ['bump', 'splash'] },
    { id: 'leafy', name: 'Leafy', type: 'leaf', image: 'l.svg', baseStats: { hp: 50, attack: 50, defense: 50 }, moves: ['bump', 'leafy'] },
  ],
};
const sp = (id: string) => data.species.find((s) => s.id === id)!;
/** rng that always returns n (just under 1 = top damage roll, picks the last move). */
const always = (n: number) => () => n;
const ctx = (n = 0.999) => makeBattleContext(data, always(n));

function mon(id: string, level = 5, hp?: number): Creature {
  const c = createCreature(sp(id), level);
  return hp === undefined ? c : { ...c, hp };
}

describe('startBattle', () => {
  it('leads with the first creature that is awake', () => {
    const s = startBattle([mon('firey', 5, 0), mon('watery')], mon('leafy'));
    expect(s.activeIndex).toBe(1);
    expect(s.outcome).toBeNull();
  });

  it('refuses to start when every party creature is asleep', () => {
    expect(() => startBattle([mon('firey', 5, 0)], mon('leafy'))).toThrow();
  });

  it('does not mutate the creatures passed in', () => {
    const party = [mon('firey')];
    const wild = mon('leafy');
    const s = startBattle(party, wild);
    takeTurn(s, { kind: 'fight', moveIndex: 1 }, ctx());
    expect(party[0].hp).toBe(party[0].maxHp);
    expect(wild.hp).toBe(wild.maxHp);
  });
});

describe('fight', () => {
  it('player hits first, then the wild creature hits back with a random move', () => {
    const s = startBattle([mon('firey')], mon('watery'));
    const { state, events } = takeTurn(s, { kind: 'fight', moveIndex: 0 }, ctx());
    expect(events.map((e) => e.kind)).toEqual(['move', 'damage', 'move', 'damage']);
    expect(events[0]).toMatchObject({ side: 'player', moveName: 'Bump' });
    expect(events[1]).toMatchObject({ target: 'wild', effectiveness: 'normal' });
    // rng 0.999 picks the wild creature's last move (Splash: water on fire = super)
    expect(events[2]).toMatchObject({ side: 'wild', moveName: 'Splash' });
    expect(events[3]).toMatchObject({ target: 'player', effectiveness: 'super' });
    expect(state.wild.hp).toBe(s.wild.hp - (events[1] as any).amount);
    expect(state.party[0].hp).toBe(s.party[0].hp - (events[3] as any).amount);
  });

  it('reports super effective hits from the player', () => {
    const s = startBattle([mon('firey')], mon('leafy'));
    const { events } = takeTurn(s, { kind: 'fight', moveIndex: 1 }, ctx());
    expect(events[1]).toMatchObject({ target: 'wild', effectiveness: 'super' });
  });

  it('softens wild damage so fights are gentle', () => {
    expect(WILD_DAMAGE_SCALE).toBeLessThan(1);
    // same creature, same move: the player's hit vs the wild's hit
    const s = startBattle([mon('firey')], mon('firey'));
    const { events } = takeTurn(s, { kind: 'fight', moveIndex: 1 }, ctx());
    const playerHit = (events[1] as any).amount;
    const wildHit = (events[3] as any).amount;
    expect(wildHit).toBe(Math.max(1, Math.floor(playerHit * WILD_DAMAGE_SCALE)));
  });

  it('wins when the wild creature runs out of HP, and it does not hit back', () => {
    const s = startBattle([mon('firey')], mon('leafy', 5, 1));
    const { state, events } = takeTurn(s, { kind: 'fight', moveIndex: 0 }, ctx());
    expect(events.map((e) => e.kind)).toEqual(['move', 'damage', 'faint', 'won']);
    expect(state.wild.hp).toBe(0);
    expect(state.outcome).toBe('won');
    expect(state.party[0].hp).toBe(s.party[0].hp);
  });

  it('loses (nap time) when the active creature runs out of HP', () => {
    const s = startBattle([mon('firey', 5, 1), mon('watery')], mon('watery'));
    const { state, events } = takeTurn(s, { kind: 'fight', moveIndex: 0 }, ctx());
    expect(events.slice(-2).map((e) => e.kind)).toEqual(['faint', 'lost']);
    expect(events.at(-2)).toMatchObject({ side: 'player' });
    expect(state.party[0].hp).toBe(0);
    expect(state.outcome).toBe('lost');
  });

  it('never drops HP below 0', () => {
    const s = startBattle([mon('firey', 20)], mon('leafy', 2, 1));
    const { state } = takeTurn(s, { kind: 'fight', moveIndex: 1 }, ctx());
    expect(state.wild.hp).toBe(0);
  });
});

describe('swap', () => {
  it('switches the active creature, then the wild creature attacks the new one', () => {
    const s = startBattle([mon('firey'), mon('leafy')], mon('watery'));
    const { state, events } = takeTurn(s, { kind: 'swap', partyIndex: 1 }, ctx());
    expect(events[0]).toEqual({ kind: 'swap', partyIndex: 1 });
    expect(state.activeIndex).toBe(1);
    expect(events.at(-1)).toMatchObject({ kind: 'damage', target: 'player', effectiveness: 'weak' });
    expect(state.party[1].hp).toBeLessThan(s.party[1].hp);
    expect(state.party[0].hp).toBe(s.party[0].hp);
  });

  it('rejects swapping to the current, a sleeping, or a missing creature', () => {
    const s = startBattle([mon('firey'), mon('leafy', 5, 0)], mon('watery'));
    expect(() => takeTurn(s, { kind: 'swap', partyIndex: 0 }, ctx())).toThrow();
    expect(() => takeTurn(s, { kind: 'swap', partyIndex: 1 }, ctx())).toThrow();
    expect(() => takeTurn(s, { kind: 'swap', partyIndex: 5 }, ctx())).toThrow();
  });
});

describe('run', () => {
  it('always gets away', () => {
    const s = startBattle([mon('firey')], mon('watery'));
    const { state, events } = takeTurn(s, { kind: 'run' }, ctx());
    expect(events).toEqual([{ kind: 'ran' }]);
    expect(state.outcome).toBe('ran');
  });
});

describe('after the battle ends', () => {
  it('refuses more actions', () => {
    let s: BattleState = startBattle([mon('firey')], mon('watery'));
    s = takeTurn(s, { kind: 'run' }, ctx()).state;
    expect(() => takeTurn(s, { kind: 'fight', moveIndex: 0 }, ctx())).toThrow();
  });
});

describe('makeBattleContext', () => {
  it('rejects a move index the creature does not have', () => {
    const s = startBattle([mon('firey')], mon('watery'));
    expect(() => takeTurn(s, { kind: 'fight', moveIndex: 2 }, ctx())).toThrow();
  });
});
