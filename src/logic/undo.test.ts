import { describe, expect, it } from 'vitest';
import { UndoHistory } from './undo';

describe('UndoHistory', () => {
  it('gives back saved states newest first', () => {
    const h = new UndoHistory<string>();
    h.push('blank');
    h.push('one line');
    expect(h.canUndo).toBe(true);
    expect(h.undo()).toBe('one line');
    expect(h.undo()).toBe('blank');
    expect(h.canUndo).toBe(false);
  });

  it('gives back nothing when there is nothing to undo', () => {
    const h = new UndoHistory<string>();
    expect(h.canUndo).toBe(false);
    expect(h.undo()).toBeUndefined();
  });

  it('keeps only the newest states, dropping the oldest past the limit', () => {
    const h = new UndoHistory<number>(3);
    for (let i = 1; i <= 5; i++) h.push(i);
    expect([h.undo(), h.undo(), h.undo(), h.undo()]).toEqual([5, 4, 3, undefined]);
  });

  it('holds 20 steps by default', () => {
    const h = new UndoHistory<number>();
    for (let i = 1; i <= 25; i++) h.push(i);
    const undone: number[] = [];
    while (h.canUndo) undone.push(h.undo()!);
    expect(undone).toHaveLength(20);
    expect(undone[0]).toBe(25);
    expect(undone[19]).toBe(6);
  });

  it('forgets everything when cleared', () => {
    const h = new UndoHistory<string>();
    h.push('a');
    h.push('b');
    h.clear();
    expect(h.canUndo).toBe(false);
    expect(h.undo()).toBeUndefined();
  });
});
