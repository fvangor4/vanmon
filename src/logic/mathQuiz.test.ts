import { describe, expect, it } from 'vitest';
import { makeQuiz } from './mathQuiz';

/** Small seeded generator so every run checks the same many quizzes. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('makeQuiz', () => {
  it('asks three different gentle sums, each with three different choices from 0 to 10 including the answer', () => {
    for (let seed = 1; seed <= 2000; seed++) {
      const quiz = makeQuiz(seeded(seed));
      expect(quiz).toHaveLength(3);
      // 3 + 4 and 4 + 3 count as the same question
      expect(new Set(quiz.map((p) => `${Math.min(p.a, p.b)}+${Math.max(p.a, p.b)}`)).size, `seed ${seed}`).toBe(3);
      for (const p of quiz) {
        expect(p.a).toBeGreaterThanOrEqual(1);
        expect(p.b).toBeGreaterThanOrEqual(1);
        expect(p.answer).toBe(p.a + p.b);
        expect(p.answer).toBeLessThanOrEqual(10);
        expect(p.choices).toHaveLength(3);
        expect(new Set(p.choices).size).toBe(3);
        expect(p.choices).toContain(p.answer);
        for (const c of p.choices) {
          expect(Number.isInteger(c)).toBe(true);
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThanOrEqual(10);
        }
      }
    }
  });

  it('uses every sum and puts the answer in every button position', () => {
    const sums = new Set<string>();
    const answerSlots = [0, 0, 0];
    for (let seed = 1; seed <= 2000; seed++) {
      for (const p of makeQuiz(seeded(seed))) {
        sums.add(`${p.a}+${p.b}`);
        answerSlots[p.choices.indexOf(p.answer)]++;
      }
    }
    expect(sums.size).toBe(45); // a, b ≥ 1 with a + b ≤ 10
    for (const n of answerSlots) expect(n / 6000).toBeGreaterThan(0.28);
  });

  it('does not let "always tap the biggest, smallest or middle number" win more than about a third of the time', () => {
    const wins = { biggest: 0, middle: 0, smallest: 0 };
    let total = 0;
    for (let seed = 1; seed <= 2000; seed++) {
      for (const p of makeQuiz(seeded(seed))) {
        total++;
        const sorted = [...p.choices].sort((x, y) => x - y);
        if (p.answer === sorted[2]) wins.biggest++;
        else if (p.answer === sorted[1]) wins.middle++;
        else wins.smallest++;
      }
    }
    for (const [habit, n] of Object.entries(wins)) {
      expect(n / total, habit).toBeGreaterThan(0.29);
      expect(n / total, habit).toBeLessThan(0.38);
    }
  });

  it('works even with an rng that always returns the same number', () => {
    for (const r of [0, 0.5, 0.999999]) {
      const quiz = makeQuiz(() => r);
      expect(new Set(quiz.map((p) => `${Math.min(p.a, p.b)}+${Math.max(p.a, p.b)}`)).size).toBe(3);
      for (const p of quiz) expect(new Set(p.choices).size).toBe(3);
    }
  });

  it('refuses an rng outside [0, 1)', () => {
    expect(() => makeQuiz(() => 1)).toThrow(RangeError);
    expect(() => makeQuiz(() => -0.1)).toThrow(RangeError);
    expect(() => makeQuiz(() => Number.NaN)).toThrow(RangeError);
  });
});
