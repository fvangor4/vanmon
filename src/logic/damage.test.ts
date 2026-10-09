import { describe, expect, it } from 'vitest';
import { calcDamage, effectiveness, type DamageInput } from './damage';

const fixed = (n: number) => () => n;

function input(overrides: Partial<DamageInput> = {}): DamageInput {
  return {
    attacker: { level: 5, attack: 10 },
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
  it('lands the balance anchor at level 5 with equal stats vs a 20 HP creature', () => {
    const plain = calcDamage(input({ move: { type: 'normal', power: 35 } })).damage; // Bump/Bonk/Swipe
    const typed = calcDamage(input({ move: { type: 'water', power: 45 }, defender: { defense: 10, type: 'water' } })).damage; // type move, neutral
    const superHit = calcDamage(input({ move: { type: 'water', power: 50 } })).damage; // water on fire
    expect(plain).toBe(4);
    expect(typed).toBe(5);
    expect(superHit).toBe(11);
    expect(Math.ceil(20 / plain)).toBe(5); // plain move: 5 hits
    expect(Math.ceil(20 / superHit)).toBe(2); // super effective: 2 hits
  });

  it('doubles-ish for super effective and halves-ish for weak', () => {
    const plain = calcDamage(input({ move: { type: 'water', power: 45 }, attacker: { level: 5, attack: 10 }, defender: { defense: 10, type: 'water' } }));
    const sup = calcDamage(input({ move: { type: 'water', power: 45 }, attacker: { level: 5, attack: 10 }, defender: { defense: 10, type: 'fire' } }));
    const weak = calcDamage(input({ move: { type: 'water', power: 45 }, attacker: { level: 5, attack: 10 }, defender: { defense: 10, type: 'leaf' } }));
    expect(sup.effectiveness).toBe('super');
    expect(weak.effectiveness).toBe('weak');
    expect(plain.effectiveness).toBe('normal');
    // base 5.6 at a top roll: plain 5, super ×2 = 11, weak ×0.5 = 2
    expect(plain.damage).toBe(5);
    expect(sup.damage).toBe(11);
    expect(weak.damage).toBe(2);
  });


  it('grows with level, attack and power; shrinks with defense', () => {
    const base = calcDamage(input()).damage;
    expect(calcDamage(input({ attacker: { level: 20, attack: 10 } })).damage).toBeGreaterThan(base);
    expect(calcDamage(input({ attacker: { level: 5, attack: 20 } })).damage).toBeGreaterThan(base);
    expect(calcDamage(input({ move: { type: 'normal', power: 90 } })).damage).toBeGreaterThan(base);
    expect(calcDamage(input({ defender: { defense: 30, type: 'fire' } })).damage).toBeLessThan(base);
  });

  it('varies by at most 15% with the random roll', () => {
    const big = { attacker: { level: 20, attack: 40 }, move: { type: 'normal' as const, power: 50 } };
    const high = calcDamage(input({ ...big, rng: fixed(0.999) })).damage;
    const low = calcDamage(input({ ...big, rng: fixed(0) })).damage;
    // base 42: top roll ×0.99985 → 41, bottom roll ×0.85 → 35
    expect(high).toBe(41);
    expect(low).toBe(35);
  });

  it('always does at least 1 whole point of damage', () => {
    // weak move, no same-type bonus, low roll: 2 × 0.5 × 0.85 = 0.85 would floor to 0
    const r = calcDamage(input({ attacker: { level: 1, attack: 1 }, defender: { defense: 200, type: 'water' }, move: { type: 'fire', power: 1 }, rng: fixed(0) }));
    expect(r.damage).toBe(1);
    for (const n of [0, 0.3, 0.7, 0.999]) {
      expect(Number.isInteger(calcDamage(input({ rng: fixed(n) })).damage)).toBe(true);
    }
  });

  it('refuses an rng that returns something outside [0, 1)', () => {
    for (const bad of [Number.NaN, 1, -0.1, 7]) {
      expect(() => calcDamage(input({ rng: fixed(bad) }))).toThrow(RangeError);
    }
  });
});
