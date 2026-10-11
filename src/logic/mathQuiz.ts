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

/** Three different sums a + b (a, b ≥ 1, a + b ≤ 10). */
export function makeQuiz(rng: Rng): MathProblem[] {
  const sums: [number, number][] = [];
  for (let a = 1; a < MAX_SUM; a++) {
    for (let b = 1; a + b <= MAX_SUM; b++) sums.push([a, b]);
  }
  const quiz: MathProblem[] = [];
  for (let i = 0; i < QUIZ_LENGTH; i++) {
    const [a, b] = take(sums, rng);
    quiz.push({ a, b, answer: a + b, choices: choicesFor(a + b, rng) });
  }
  return quiz;
}
