// The running game: creature data, the player's state, and saving.
// Scenes share this one object instead of passing state around.

import type { CreatureData, SpeciesDef } from './logic/creatures';
import type { Rng } from './logic/damage';
import type { GameState } from './logic/gameState';
import { saveGame, type KeyValueStore } from './logic/save';

export class Session {
  /** Tall-grass steps since the last battle (not saved; 0 after a reload). */
  stepsSinceBattle = 0;
  /** False when the save on this iPad is from a newer game version (see LoadResult.protectSave). */
  canSave = true;
  private readonly species: Map<string, SpeciesDef>;

  constructor(
    readonly data: CreatureData,
    public state: GameState,
    private readonly store: KeyValueStore,
    readonly rng: Rng = Math.random,
  ) {
    this.species = new Map(data.species.map((s) => [s.id, s]));
  }

  speciesById(id: string): SpeciesDef {
    const s = this.species.get(id);
    if (!s) throw new Error(`unknown species "${id}"`);
    return s;
  }

  save(): void {
    if (!this.canSave) return;
    if (!saveGame(this.store, this.state)) console.warn('VanMon: could not save (storage full or blocked)');
  }
}

let current: Session | null = null;

export function setSession(s: Session): void {
  current = s;
}

export function session(): Session {
  if (!current) throw new Error('game has not started yet');
  return current;
}

/** Phaser texture key for a species' picture. */
export function creatureTexture(speciesId: string): string {
  return `creature:${speciesId}`;
}

/** URL for a file in public/, correct both in dev ('/') and on GitHub Pages ('/vanmon/'). */
export function publicUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}
