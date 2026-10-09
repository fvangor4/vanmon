// Data for the Party, Box and Creature Book screens.

import type { CreatureData, SpeciesDef } from './creatures';
import type { BookEntry } from './gameState';

export type BookStatus = BookEntry | 'unknown';

export interface BookRow {
  species: SpeciesDef;
  status: BookStatus;
}

/** Every species, in creatures.json order, with what the player knows about it. */
export function bookEntries(data: CreatureData, book: Record<string, BookEntry>): BookRow[] {
  return data.species.map((species) => ({ species, status: book[species.id] ?? 'unknown' }));
}

export function bookProgress(data: CreatureData, book: Record<string, BookEntry>): { caught: number; seen: number; total: number } {
  const rows = bookEntries(data, book);
  return {
    caught: rows.filter((r) => r.status === 'caught').length,
    seen: rows.filter((r) => r.status !== 'unknown').length,
    total: rows.length,
  };
}

export function pageCount(items: readonly unknown[], size: number): number {
  return Math.max(1, Math.ceil(items.length / size));
}

export function pageOf<T>(items: readonly T[], page: number, size: number): T[] {
  const p = Math.min(Math.max(0, page), pageCount(items, size) - 1);
  return items.slice(p * size, p * size + size);
}
