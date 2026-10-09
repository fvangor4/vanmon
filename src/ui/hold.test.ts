import { describe, expect, it } from 'vitest';
import { HoldTracker } from './hold';

describe('HoldTracker', () => {
  it('fills up while held and completes once at the full time', () => {
    const h = new HoldTracker(1500);
    h.press(1000);
    expect(h.update(1750)).toEqual({ progress: 0.5, done: false });
    expect(h.update(2500)).toEqual({ progress: 1, done: true });
    expect(h.update(2600)).toEqual({ progress: 1, done: false }); // only fires once
  });

  it('a quick tap never completes, and letting go resets', () => {
    const h = new HoldTracker(1500);
    h.press(0);
    expect(h.update(200).done).toBe(false);
    h.release();
    expect(h.update(5000)).toEqual({ progress: 0, done: false });
  });

  it('starts over on a new press', () => {
    const h = new HoldTracker(1000);
    h.press(0);
    h.update(900);
    h.release();
    h.press(2000);
    expect(h.update(2500)).toEqual({ progress: 0.5, done: false });
  });

  it('does nothing until pressed', () => {
    expect(new HoldTracker(1000).update(99999)).toEqual({ progress: 0, done: false });
  });

  it('a second full hold fires again', () => {
    const h = new HoldTracker(1000);
    h.press(0);
    expect(h.update(1000).done).toBe(true);
    h.release();
    h.press(5000);
    expect(h.update(6000).done).toBe(true);
  });
});
