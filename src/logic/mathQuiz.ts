// The Gold Kid's addition questions: small sums a 5-year-old can count out,
// each answered by tapping one of three numbers.

import type { Rng } from './damage';

export const QUIZ_LENGTH = 3;
export const MAX_SUM = 10;
/** Wrong choices are this close to the answer, so they look like real guesses. */
const NEAR = 3;

export interface MathProblem {
  a: number;
  b: number;
  answer: number;
  /** Three different numbers, one of them the answer, in random order. */
  choices: number[];
}

function roll(rng: Rng): number {
  const r = rng();
  if (!(r >= 0 && r < 1)) throw new RangeError(`rng must return a number in [0, 1), got ${r}`);
  return r;
}

/** Removes and returns a random item. */
function take<T>(items: T[], rng: Rng): T {
  return items.splice(Math.floor(roll(rng) * items.length), 1)[0];
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const left = [...items];
  const out: T[] = [];
  while (left.length > 0) out.push(take(left, rng));
  return out;
}

function choicesFor(answer: number, rng: Rng): number[] {
  const near: number[] = [];
  for (let n = Math.max(0, answer - NEAR); n <= Math.min(MAX_SUM, answer + NEAR); n++) {
    if (n !== answer) near.push(n);
  }
  return shuffle([answer, take(near, rng), take(near, rng)], rng);
}

/**
 * Three different sums a + b (a, b ≥ 1, a + b ≤ 10). The total is picked first,
 * evenly, so big totals (which have the most pairs) don't crowd out small ones
 * and "tap the biggest number" isn't a winning habit. 3 + 4 and 4 + 3 count as
 * the same question.
 */
export function makeQuiz(rng: Rng): MathProblem[] {
  const byTotal = new Map<number, [number, number][]>();
  for (let a = 1; a < MAX_SUM; a++) {
    for (let b = 1; a + b <= MAX_SUM; b++) {
      const pairs = byTotal.get(a + b) ?? [];
      pairs.push([a, b]);
      byTotal.set(a + b, pairs);
    }
  }
  const quiz: MathProblem[] = [];
  for (let i = 0; i < QUIZ_LENGTH; i++) {
    const totals = [...byTotal.keys()].filter((t) => byTotal.get(t)!.length > 0);
    const total = take(totals, rng);
    const pairs = byTotal.get(total)!;
    const [a, b] = take(pairs, rng);
    const mirror = pairs.findIndex(([x, y]) => x === b && y === a);
    if (mirror >= 0) pairs.splice(mirror, 1);
    quiz.push({ a, b, answer: total, choices: choicesFor(total, rng) });
  }
  return quiz;
}
