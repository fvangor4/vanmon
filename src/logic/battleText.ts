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

/** A type's icon and name, e.g. "🔥 Fire", for the battle cards. */
export function typeLabel(type: MoveType): string {
  return `${TYPE_ICON[type]} ${type[0].toUpperCase()}${type.slice(1)}`;
}

export interface BattleNames {
  /** Name of the player's creature in a party slot. */
  player(partyIndex: number): string;
  /** Party slot of the creature currently out. */
  active: number;
  wild: string;
  /** Set in an NPC battle: the NPC's name, e.g. "The Gold Kid". */
  npc?: string;
}

/** "The Gold Kid" reads as "the Gold Kid" mid-sentence. */
const midSentence = (name: string) => name.replace(/^The /, 'the ');

/** The message for one event, or null if it needs no words. */
export function battleText(e: BattleEvent, n: BattleNames): string | null {
  const foe = n.npc ? `${n.npc}'s ${n.wild}` : `The wild ${n.wild}`;
  switch (e.kind) {
    case 'move':
      return e.side === 'player' ? `${n.player(n.active)} used ${e.moveName}!` : `${foe} used ${e.moveName}!`;
    case 'damage':
      if (e.effectiveness === 'super') return '💥 Super effective!';
      if (e.effectiveness === 'weak') return 'Not very effective…';
      return null;
    case 'faint':
      return e.side === 'wild' ? `${foe} is sleepy! 💤` : `${n.player(n.active)} is sleepy! 💤`;
    case 'swap':
      return `Go, ${n.player(e.partyIndex)}!`;
    case 'catch':
      if (e.caught) return `Yay! You caught ${n.wild}! 🎉`;
      return ['Oh no! It popped right out!', 'It broke free!', 'Aww! So close!'][e.wiggles] ?? 'It broke free!';
    case 'ran':
      return 'You got away safely! 🏃';
    case 'won':
      return n.npc ? `You beat ${midSentence(n.npc)}! 🎉` : 'You won! 🎉';
    case 'lost':
      return n.npc
        ? `Time for a nap! 💤 Good try! Talk to ${midSentence(n.npc)} to try again.`
        : "Time for a nap! 💤 Let's go home and rest.";
  }
}

export function levelUpText(name: string, level: number): string {
  return `${name} grew to level ${level}! ⭐`;
}

export function boxText(name: string): string {
  return `Your party is full, so ${name} went to your Box at home. 📦`;
}

export function npcIntroText(npc: string, creature: string): string {
  return `${npc} sends out ${creature}!`;
}

export function prizeText(npc: string, creature: string, where: 'party' | 'box'): string {
  const gift = `${npc} gives you a ${creature} to keep! 🎁`;
  return where === 'box' ? `${gift} Your party is full, so it went to your Box at home. 📦` : gift;
}
