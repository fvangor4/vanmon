// Battle engine. Pure: takes a state and an action, returns the next state plus
// a list of events for the battle scene to animate and read aloud.
// The player always acts first; the wild creature picks a random move.

import type { Creature, CreatureData, MoveDef, SpeciesDef } from './creatures';
import { calcDamage, type Effectiveness, type Rng } from './damage';

/** Wild creatures hit softer, so a 5-year-old's starter isn't knocked out in two hits. */
export const WILD_DAMAGE_SCALE = 0.6;

export type Side = 'player' | 'wild';
export type Outcome = 'won' | 'lost' | 'ran';

export interface BattleState {
  party: Creature[];
  activeIndex: number;
  wild: Creature;
  outcome: Outcome | null;
}

export type BattleAction =
  | { kind: 'fight'; moveIndex: number }
  | { kind: 'swap'; partyIndex: number }
  | { kind: 'run' };

export type BattleEvent =
  | { kind: 'move'; side: Side; moveId: string; moveName: string }
  | { kind: 'damage'; target: Side; amount: number; hpAfter: number; effectiveness: Effectiveness }
  | { kind: 'faint'; side: Side }
  | { kind: 'swap'; partyIndex: number }
  | { kind: 'ran' }
  | { kind: 'won' }
  | { kind: 'lost' };

export interface BattleContext {
  species(id: string): SpeciesDef;
  move(id: string): MoveDef;
  rng: Rng;
}

export interface TurnResult {
  state: BattleState;
  events: BattleEvent[];
}

export function makeBattleContext(data: CreatureData, rng: Rng): BattleContext {
  const species = new Map(data.species.map((s) => [s.id, s]));
  const moves = new Map(data.moves.map((m) => [m.id, m]));
  return {
    species(id) {
      const s = species.get(id);
      if (!s) throw new Error(`unknown species "${id}"`);
      return s;
    },
    move(id) {
      const m = moves.get(id);
      if (!m) throw new Error(`unknown move "${id}"`);
      return m;
    },
    rng,
  };
}

export function startBattle(party: Creature[], wild: Creature): BattleState {
  if (wild.hp <= 0) throw new Error('cannot battle a wild creature that is already asleep');
  const activeIndex = party.findIndex((c) => c.hp > 0);
  if (activeIndex === -1) throw new Error('cannot battle: every party creature is asleep');
  return {
    party: party.map((c) => ({ ...c })),
    activeIndex,
    wild: { ...wild },
    outcome: null,
  };
}

/** One attack. Mutates `defender` (a copy owned by this turn) and appends events. */
function attack(
  side: Side,
  attacker: Creature,
  defender: Creature,
  move: MoveDef,
  ctx: BattleContext,
  events: BattleEvent[],
): void {
  const target: Side = side === 'player' ? 'wild' : 'player';
  const { damage, effectiveness } = calcDamage({
    attacker,
    defender: { defense: defender.defense, type: ctx.species(defender.speciesId).type },
    move,
    rng: ctx.rng,
  });
  const hit = side === 'wild' ? Math.max(1, Math.floor(damage * WILD_DAMAGE_SCALE)) : damage;
  // Report HP actually lost, so a finishing blow never claims more than was left.
  const amount = Math.min(hit, defender.hp);
  defender.hp -= amount;
  events.push({ kind: 'move', side, moveId: move.id, moveName: move.name });
  events.push({ kind: 'damage', target, amount, hpAfter: defender.hp, effectiveness });
}

/** The wild creature's turn: random move at the active creature; may end the battle. */
function wildTurn(state: BattleState, ctx: BattleContext, events: BattleEvent[]): void {
  const moves = ctx.species(state.wild.speciesId).moves;
  const r = ctx.rng();
  if (!(r >= 0 && r < 1)) throw new RangeError(`rng must return a number in [0, 1), got ${r}`);
  const moveId = moves[Math.floor(r * moves.length)];
  const active = state.party[state.activeIndex];
  attack('wild', state.wild, active, ctx.move(moveId), ctx, events);
  if (active.hp === 0) {
    events.push({ kind: 'faint', side: 'player' }, { kind: 'lost' });
    state.outcome = 'lost';
  }
}

export function takeTurn(prev: BattleState, action: BattleAction, ctx: BattleContext): TurnResult {
  if (prev.outcome) throw new Error(`battle is already over (${prev.outcome})`);
  const state: BattleState = {
    ...prev,
    party: prev.party.map((c) => ({ ...c })),
    wild: { ...prev.wild },
  };
  const events: BattleEvent[] = [];

  switch (action.kind) {
    case 'run':
      events.push({ kind: 'ran' });
      state.outcome = 'ran';
      break;

    case 'swap': {
      const next = state.party[action.partyIndex];
      if (!next) throw new Error(`no creature in party slot ${action.partyIndex}`);
      if (action.partyIndex === state.activeIndex) throw new Error('that creature is already out');
      if (next.hp === 0) throw new Error('that creature is asleep');
      state.activeIndex = action.partyIndex;
      events.push({ kind: 'swap', partyIndex: action.partyIndex });
      wildTurn(state, ctx, events);
      break;
    }

    case 'fight': {
      const active = state.party[state.activeIndex];
      const moveId = ctx.species(active.speciesId).moves[action.moveIndex];
      if (moveId === undefined) throw new Error(`creature has no move ${action.moveIndex}`);
      attack('player', active, state.wild, ctx.move(moveId), ctx, events);
      if (state.wild.hp === 0) {
        events.push({ kind: 'faint', side: 'wild' }, { kind: 'won' });
        state.outcome = 'won';
      } else {
        wildTurn(state, ctx, events);
      }
      break;
    }
  }

  return { state, events };
}
