import { describe, expect, it } from 'vitest';
import { catchChance, rollCatch } from './catch';

const seq = (...values: number[]) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};

describe('catchChance', () => {
  it('usually works even at full HP (60%), and almost always when nearly asleep', () => {
    expect(catchChance({ hp: 20, maxHp: 20 })).toBeCloseTo(0.6);
    expect(catchChance({ hp: 1, maxHp: 20 })).toBeGreaterThan(0.9);
    expect(catchChance({ hp: 1, maxHp: 20 })).toBeLessThanOrEqual(0.95);
  });

  it('gets easier as HP drops', () => {
    expect(catchChance({ hp: 5, maxHp: 20 })).toBeGreaterThan(catchChance({ hp: 15, maxHp: 20 }));
  });

  it('refuses impossible HP instead of quietly always (or never) catching', () => {
    for (const bad of [{ hp: 0, maxHp: 0 }, { hp: Number.NaN, maxHp: 20 }, { hp: 60, maxHp: 20 }, { hp: -1, maxHp: 20 }]) {
      expect(() => catchChance(bad)).toThrow(RangeError);
    }
  });
});

describe('rollCatch', () => {
  it('catches after 3 wiggles when every wiggle roll passes', () => {
    expect(rollCatch({ hp: 20, maxHp: 20 }, seq(0, 0, 0))).toEqual({ wiggles: 3, caught: true });
  });

  it('breaks free on the wiggle whose roll fails, keeping the suspense', () => {
    // full HP: each wiggle passes with 0.6^(1/3) ≈ 0.843
    expect(rollCatch({ hp: 20, maxHp: 20 }, seq(0.9))).toEqual({ wiggles: 0, caught: false });
    expect(rollCatch({ hp: 20, maxHp: 20 }, seq(0.5, 0.5, 0.9))).toEqual({ wiggles: 2, caught: false });
  });

  it('a roll exactly at the per-wiggle odds fails that wiggle', () => {
    expect(rollCatch({ hp: 20, maxHp: 20 }, seq(Math.cbrt(0.6)))).toEqual({ wiggles: 0, caught: false });
  });

  it('succeeds overall about as often as catchChance says', () => {
    // mulberry32: small, well-known seeded PRNG (32-bit math via Math.imul)
    let a = 12345;
    const lcg = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    let caught = 0;
    const tries = 20000;
    for (let i = 0; i < tries; i++) if (rollCatch({ hp: 20, maxHp: 20 }, lcg).caught) caught++;
    expect(caught / tries).toBeGreaterThan(0.57);
    expect(caught / tries).toBeLessThan(0.63);
  });

  it('refuses an rng outside [0, 1)', () => {
    expect(() => rollCatch({ hp: 20, maxHp: 20 }, seq(1))).toThrow(RangeError);
    expect(() => rollCatch({ hp: 20, maxHp: 20 }, seq(Number.NaN))).toThrow(RangeError);
  });
});
