// What the battle screen says (and reads aloud) for each battle event.
// Short, cheerful sentences a 5-year-old can follow by ear.

import type { BattleEvent } from './battle';
import type { MoveType } from './creatures';

export const TYPE_ICON: Record<MoveType, string> = {
  normal: '⭐',
  fire: '🔥',
  water: '💧',
  leaf: '🍃',
};

export interface BattleNames {
  /** Name of the player's creature in a party slot. */
  player(partyIndex: number): string;
  /** Party slot of the creature currently out. */
  active: number;
  wild: string;
}

/** The message for one event, or null if it needs no words. */
export function battleText(e: BattleEvent, n: BattleNames): string | null {
  switch (e.kind) {
    case 'move':
      return e.side === 'player' ? `${n.player(n.active)} used ${e.moveName}!` : `The wild ${n.wild} used ${e.moveName}!`;
    case 'damage':
      if (e.effectiveness === 'super') return '💥 Super effective!';
      if (e.effectiveness === 'weak') return 'Not very effective…';
      return null;
    case 'faint':
      return e.side === 'wild' ? `The wild ${n.wild} is sleepy! 💤` : `${n.player(n.active)} is sleepy! 💤`;
    case 'swap':
      return `Go, ${n.player(e.partyIndex)}!`;
    case 'catch':
      if (e.caught) return `Yay! You caught ${n.wild}! 🎉`;
      return ['Oh no! It popped right out!', 'It broke free!', 'Aww! So close!'][e.wiggles] ?? 'It broke free!';
    case 'ran':
      return 'You got away safely! 🏃';
    case 'won':
      return 'You won! 🎉';
    case 'lost':
      return "Your creatures got sleepy! 💤 Let's go home and rest.";
  }
}

export function levelUpText(name: string, level: number): string {
  return `${name} grew to level ${level}! ⭐`;
}

export function boxText(name: string): string {
  return `Your party is full, so ${name} went to your Box at home. 📦`;
}
