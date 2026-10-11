// Everything a player has: their party, the Box at home, the Creature Book,
// and where they are standing. All updates return a new state.

import type { BattleState } from './battle';
import type { Creature, CreatureData } from './creatures';
import type { Point } from './map';
import { gainXp, xpForWin } from './xp';
import { START } from '../data/maps';

export const PARTY_MAX = 6;

export type BookEntry = 'seen' | 'caught';

export interface Position extends Point {
  map: string;
}

export interface GameState {
  party: Creature[];
  box: Creature[];
  /** Species the player has met, by species id. */
  book: Record<string, BookEntry>;
  position: Position;
  /** NPCs the player has beaten at least once, by NPC id (their prize is given only once). */
  npcsBeaten: string[];
}

export function newGame(starter: Creature): GameState {
  return {
    party: [starter],
    box: [],
    book: { [starter.speciesId]: 'caught' },
    position: { ...START },
    npcsBeaten: [],
  };
}

export function markSeen(state: GameState, speciesId: string): GameState {
  if (state.book[speciesId]) return state;
  return { ...state, book: { ...state.book, [speciesId]: 'seen' } };
}

export function addCaught(
  state: GameState,
  creature: Creature,
): { state: GameState; where: 'party' | 'box' } {
  const book = { ...state.book, [creature.speciesId]: 'caught' as const };
  if (state.party.length < PARTY_MAX) {
    return { state: { ...state, book, party: [...state.party, creature] }, where: 'party' };
  }
  return { state: { ...state, book, box: [...state.box, creature] }, where: 'box' };
}

export function healAll(state: GameState): GameState {
  const heal = (c: Creature) => ({ ...c, hp: c.maxHp });
  return { ...state, party: state.party.map(heal), box: state.box.map(heal) };
}

function checkSlot(list: Creature[], index: number, what: string): void {
  if (!Number.isInteger(index) || index < 0 || index >= list.length) {
    throw new Error(`no creature in ${what} slot ${index}`);
  }
}

export function setLead(state: GameState, partyIndex: number): GameState {
  checkSlot(state.party, partyIndex, 'party');
  const party = [...state.party];
  const [lead] = party.splice(partyIndex, 1);
  return { ...state, party: [lead, ...party] };
}

export function depositToBox(state: GameState, partyIndex: number): GameState {
  checkSlot(state.party, partyIndex, 'party');
  if (state.party.length === 1) throw new Error('you always keep one creature with you');
  const party = [...state.party];
  const [moved] = party.splice(partyIndex, 1);
  return { ...state, party, box: [...state.box, moved] };
}

export function withdrawFromBox(state: GameState, boxIndex: number): GameState {
  checkSlot(state.box, boxIndex, 'box');
  if (state.party.length >= PARTY_MAX) throw new Error(`the party already has ${PARTY_MAX}`);
  const box = [...state.box];
  const [moved] = box.splice(boxIndex, 1);
  return { ...state, box, party: [...state.party, moved] };
}

export interface OutcomeResult {
  state: GameState;
  /** Levels the creature that fought reached (for the celebration). */
  levelUps: number[];
}

/** Folds a finished battle back into the game. Losing sends everyone home, healed. */
export function applyBattleOutcome(
  prev: GameState,
  battle: BattleState,
  data: CreatureData,
): OutcomeResult {
  if (!battle.outcome) throw new Error('battle is not over yet');
  const sameParty =
    battle.party.length === prev.party.length && battle.party.every((c, i) => c.uid === prev.party[i].uid);
  if (!sameParty) throw new Error('battle result is for a different party');
  checkSlot(battle.party, battle.activeIndex, 'party');
  let state: GameState = markSeen({ ...prev, party: battle.party.map((c) => ({ ...c })) }, battle.wild.speciesId);
  let levelUps: number[] = [];

  switch (battle.outcome) {
    case 'won': {
      const fighter = state.party[battle.activeIndex];
      const species = data.species.find((s) => s.id === fighter.speciesId);
      if (!species) throw new Error(`unknown species "${fighter.speciesId}"`);
      const result = gainXp(fighter, xpForWin(battle.wild.level), species);
      levelUps = result.levelUps;
      state.party[battle.activeIndex] = result.creature;
      break;
    }
    case 'caught':
      state = addCaught(state, { ...battle.wild }).state;
      break;
    case 'lost':
      state = { ...healAll(state), position: { ...START } };
      break;
    case 'ran':
      break;
  }
  return { state, levelUps };
}
