import { describe, expect, it } from 'vitest';
import { clearDrawing, DRAWING_KEY, loadDrawing, MAX_DRAWING_CHARS, saveDrawing } from './drawingStore';
import { SAVE_KEY, type KeyValueStore } from './save';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { items: Record<string, string> } {
  const items = { ...initial };
  return {
    items,
    getItem: (k) => (k in items ? items[k] : null),
    setItem: (k, v) => void (items[k] = v),
    removeItem: (k) => void delete items[k],
  };
}

const throwing: KeyValueStore = {
  getItem: () => { throw new Error('SecurityError'); },
  setItem: () => { throw new Error('QuotaExceededError'); },
  removeItem: () => { throw new Error('SecurityError'); },
};

describe('drawing storage', () => {
  it('gives back the saved drawing and its type', () => {
    const store = memoryStore();
    expect(saveDrawing(store, { type: 'water', png: PNG })).toBe(true);
    expect(loadDrawing(store)).toEqual({ type: 'water', png: PNG });

    expect(saveDrawing(store, { type: null, png: PNG })).toBe(true);
    expect(loadDrawing(store)).toEqual({ type: null, png: PNG });
  });

  it('keeps only the latest drawing, under its own key, leaving the saved game alone', () => {
    const store = memoryStore({ [SAVE_KEY]: '{"version":1}' });
    saveDrawing(store, { type: 'fire', png: PNG });
    saveDrawing(store, { type: 'leaf', png: PNG });
    expect(Object.keys(store.items).sort()).toEqual([DRAWING_KEY, SAVE_KEY].sort());
    expect(store.items[SAVE_KEY]).toBe('{"version":1}');
    expect(loadDrawing(store)?.type).toBe('leaf');
  });

  it('starts blank when nothing has been drawn yet', () => {
    expect(loadDrawing(memoryStore())).toBeNull();
  });

  it('starts blank instead of breaking when the stored drawing is damaged', () => {
    const bad = [
      '{oops',
      'null',
      '"just a string"',
      JSON.stringify({ v: 2, type: 'fire', png: PNG }),
      JSON.stringify({ type: 'fire', png: PNG }),
      JSON.stringify({ v: 1, type: 'fire' }),
      JSON.stringify({ v: 1, type: 'fire', png: 42 }),
      JSON.stringify({ v: 1, type: 'fire', png: 'data:text/html;base64,PGgxPg==' }),
      JSON.stringify({ v: 1, type: 'fire', png: 'x'.repeat(MAX_DRAWING_CHARS + 1) }),
    ];
    for (const raw of bad) {
      expect(loadDrawing(memoryStore({ [DRAWING_KEY]: raw })), raw.slice(0, 60)).toBeNull();
    }
  });

  it('keeps the picture but forgets a type it does not know', () => {
    const store = memoryStore({ [DRAWING_KEY]: JSON.stringify({ v: 1, type: 'lightning', png: PNG }) });
    expect(loadDrawing(store)).toEqual({ type: null, png: PNG });
  });

  it('refuses a drawing too big to store, so the saved game always has room', () => {
    const store = memoryStore();
    const huge = 'data:image/png;base64,' + 'A'.repeat(MAX_DRAWING_CHARS);
    expect(saveDrawing(store, { type: 'fire', png: huge })).toBe(false);
    expect(store.items).toEqual({});
  });

  it('reports failure instead of throwing when the iPad will not store anything', () => {
    expect(saveDrawing(throwing, { type: 'fire', png: PNG })).toBe(false);
    expect(loadDrawing(throwing)).toBeNull();
    expect(clearDrawing(throwing)).toBe(false);
  });

  it('forgets the drawing when cleared', () => {
    const store = memoryStore({ [SAVE_KEY]: 'game' });
    saveDrawing(store, { type: 'fire', png: PNG });
    expect(clearDrawing(store)).toBe(true);
    expect(loadDrawing(store)).toBeNull();
    expect(store.items).toEqual({ [SAVE_KEY]: 'game' });
  });
});
