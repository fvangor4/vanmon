import { describe, expect, it } from 'vitest';
import { calcDamage, effectiveness, type DamageInput } from './damage';

const fixed = (n: number) => () => n;

function input(overrides: Partial<DamageInput> = {}): DamageInput {
  return {
    attacker: { level: 5, attack: 10, type: 'fire' },
    defender: { defense: 10, type: 'fire' },
    move: { type: 'normal', power: 45 },
    rng: fixed(0.999),
    ...overrides,
  };
}

describe('effectiveness (fire > leaf > water > fire)', () => {
  it('is super effective along the triangle', () => {
    expect(effectiveness('fire', 'leaf')).toBe('super');
    expect(effectiveness('leaf', 'water')).toBe('super');
    expect(effectiveness('water', 'fire')).toBe('super');
  });

  it('is not very effective against the type that beats it', () => {
    expect(effectiveness('leaf', 'fire')).toBe('weak');
    expect(effectiveness('water', 'leaf')).toBe('weak');
    expect(effectiveness('fire', 'water')).toBe('weak');
  });

  it('is plain against its own type and for normal moves', () => {
    expect(effectiveness('fire', 'fire')).toBe('normal');
    expect(effectiveness('normal', 'water')).toBe('normal');
    expect(effectiveness('normal', 'leaf')).toBe('normal');
  });
});

describe('calcDamage', () => {
  it('lands the balance anchor: level 5 normal move, equal stats ≈ 5 damage (≈4 hits on 20 HP)', () => {
    expect(calcDamage(input()).damage).toBe(5);
  });

  it('doubles-ish for super effective and halves-ish for weak', () => {
    const plain = calcDamage(input({ move: { type: 'water', power: 45 }, attacker: { level: 5, attack: 10, type: 'fire' }, defender: { defense: 10, type: 'water' } }));
    const sup = calcDamage(input({ move: { type: 'water', power: 45 }, attacker: { level: 5, attack: 10, type: 'fire' }, defender: { defense: 10, type: 'fire' } }));
    const weak = calcDamage(input({ move: { type: 'water', power: 45 }, attacker: { level: 5, attack: 10, type: 'fire' }, defender: { defense: 10, type: 'leaf' } }));
    expect(sup.effectiveness).toBe('super');
    expect(weak.effectiveness).toBe('weak');
    expect(plain.effectiveness).toBe('normal');
    expect(sup.damage).toBeGreaterThanOrEqual(plain.damage * 2 - 1);
    expect(weak.damage).toBeLessThan(plain.damage);
  });

  it('gives a bonus when the move matches the attacker type', () => {
    const own = calcDamage(input({ move: { type: 'fire', power: 45 } }));
    const other = calcDamage(input({ move: { type: 'normal', power: 45 } }));
    expect(own.damage).toBeGreaterThan(other.damage);
  });

  it('grows with level, attack and power; shrinks with defense', () => {
    const base = calcDamage(input()).damage;
    expect(calcDamage(input({ attacker: { level: 20, attack: 10, type: 'fire' } })).damage).toBeGreaterThan(base);
    expect(calcDamage(input({ attacker: { level: 5, attack: 20, type: 'fire' } })).damage).toBeGreaterThan(base);
    expect(calcDamage(input({ move: { type: 'normal', power: 90 } })).damage).toBeGreaterThan(base);
    expect(calcDamage(input({ defender: { defense: 30, type: 'fire' } })).damage).toBeLessThan(base);
  });

  it('varies by at most 15% with the random roll', () => {
    const big = { attacker: { level: 20, attack: 40, type: 'fire' as const }, move: { type: 'normal' as const, power: 50 } };
    const high = calcDamage(input({ ...big, rng: fixed(0.999) })).damage;
    const low = calcDamage(input({ ...big, rng: fixed(0) })).damage;
    expect(low).toBeLessThan(high);
    expect(low).toBeGreaterThanOrEqual(Math.floor(high * 0.85) - 1);
  });

  it('always does at least 1 whole point of damage', () => {
    const r = calcDamage(input({ attacker: { level: 1, attack: 1, type: 'fire' }, defender: { defense: 200, type: 'water' }, move: { type: 'fire', power: 1 }, rng: fixed(0) }));
    expect(r.damage).toBe(1);
    for (const n of [0, 0.3, 0.7, 0.999]) {
      expect(Number.isInteger(calcDamage(input({ rng: fixed(n) })).damage)).toBe(true);
    }
  });
});
