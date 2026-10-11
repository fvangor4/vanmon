// Characters in town the player can talk to and battle. Beating one the first
// time wins a copy of its creature (see applyBattleOutcome in gameState.ts).

import { createCreature, type Creature, type CreatureData } from './creatures';
import type { GameState } from './gameState';

export interface NpcDef {
  id: string;
  /** Shown and read aloud. */
  name: string;
  /** The creature it battles with, and the prize for beating it the first time. */
  speciesId: string;
  /** Its picture on the map. Every key must be drawn in src/scenes/textures.ts (the compiler checks). */
  texture: NpcTexture;
}

/** NPC pictures that exist. */
export type NpcTexture = 'gold-kid';

export const GOLD_KID: NpcDef = { id: 'gold-kid', name: 'The Gold Kid', speciesId: 'super-shadehog', texture: 'gold-kid' };

export const NPCS: Record<string, NpcDef> = { [GOLD_KID.id]: GOLD_KID };

/** The NPC's creature, at the same level as the player's lead creature so it's always a fair fight. */
export function npcCreature(npc: NpcDef, state: GameState, data: CreatureData): Creature {
  const species = data.species.find((s) => s.id === npc.speciesId);
  if (!species) throw new Error(`${npc.name}'s creature "${npc.speciesId}" is not in creatures.json`);
  return createCreature(species, state.party[0].level);
}

/** What the NPC says when you walk up and talk to it (read aloud). */
export function npcGreeting(npc: NpcDef, beatenBefore: boolean): string {
  const name = npc.name.replace(/^The /, 'the ');
  return beatenBefore
    ? "Hi again! ✨ Rematch? Answer three new math questions, then let's battle!"
    : `Hi! I'm ${name}! ✨ Answer my three math questions, then let's battle!`;
}
