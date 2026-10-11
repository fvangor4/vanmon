// Keeps the latest drawing from the drawing screen on this iPad (localStorage).
// It lives under its own key, apart from the saved game: a damaged or missing
// drawing just means a blank canvas, and it can never break the saved game.

import { CREATURE_TYPES, type CreatureType } from './creatures';
import type { KeyValueStore } from './save';

export const DRAWING_KEY = 'vanmon.drawing';
const DRAWING_VERSION = 1;
/**
 * The biggest picture we'll store. Safari gives each site about 5 MB and may count
 * 2 bytes per character, so this is at most 2 MB, leaving room for the saved game.
 * A crayon drawing is usually well under 300 KB.
 */
export const MAX_DRAWING_CHARS = 1_000_000;
const PNG_PREFIX = 'data:image/png;base64,';

export interface StoredDrawing {
  type: CreatureType | null;
  /** The picture as a PNG data URL. */
  png: string;
}

/** A PNG picture small enough to keep. (Safari gives back "data:," for a canvas it can't export.) */
function isStorablePng(png: unknown): png is string {
  return typeof png === 'string' && png.startsWith(PNG_PREFIX) && png.length <= MAX_DRAWING_CHARS;
}

/**
 * Returns false (instead of throwing) if the picture isn't a usable PNG, is too big,
 * or the iPad won't store it. The previously stored drawing is then left as it was.
 */
export function saveDrawing(store: KeyValueStore, drawing: StoredDrawing): boolean {
  if (!isStorablePng(drawing.png)) return false;
  try {
    store.setItem(DRAWING_KEY, JSON.stringify({ v: DRAWING_VERSION, type: drawing.type, png: drawing.png }));
    return true;
  } catch {
    return false;
  }
}

/** The latest drawing, or null (start blank) if there is none or it can't be used. */
export function loadDrawing(store: KeyValueStore): StoredDrawing | null {
  let raw: string | null;
  let file: unknown;
  try {
    raw = store.getItem(DRAWING_KEY);
    if (raw === null) return null;
    file = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof file !== 'object' || file === null) return null;
  const { v, type, png } = file as Record<string, unknown>;
  if (v !== DRAWING_VERSION) return null;
  if (!isStorablePng(png)) return null;
  // An unknown type loses only the type, never the kid's picture.
  const known = CREATURE_TYPES.find((t) => t === type) ?? null;
  return { type: known, png };
}

export function clearDrawing(store: KeyValueStore): boolean {
  try {
    store.removeItem(DRAWING_KEY);
    return true;
  } catch {
    return false;
  }
}
