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

/**
 * The answer plus two near guesses. Where the answer lands (smallest, middle or
 * biggest of the three) is balanced so no "always tap the ..." habit wins more
 * than about a third of the time: 10 can only be the biggest and 9 (with 10
 * shown) is made the middle, so the other totals lean slightly toward smallest.
 */
function choicesFor(answer: number, rng: Rng): number[] {
  const below: number[] = [];
  const above: number[] = [];
  for (let n = Math.max(0, answer - NEAR); n < answer; n++) below.push(n);
  for (let n = answer + 1; n <= Math.min(MAX_SUM, answer + NEAR); n++) above.push(n);
  let guessesBelow: number;
  if (above.length === 0) guessesBelow = 2;
  else if (above.length === 1) guessesBelow = 1;
  else {
    // weights for 0, 1 or 2 guesses below the answer (answer smallest, middle, biggest)
    const r = roll(rng) * 7;
    guessesBelow = r < 3 ? 0 : r < 5 ? 1 : 2;
  }
  const guesses: number[] = [];
  for (let i = 0; i < guessesBelow; i++) guesses.push(take(below, rng));
  while (guesses.length < 2) guesses.push(take(above, rng));
  return shuffle([answer, ...guesses], rng);
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
