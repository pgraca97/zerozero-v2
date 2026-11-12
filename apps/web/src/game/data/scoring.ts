// Scoring rules
//
// Pure functions only, so the backend can reuse them for plausibility checks.

import { CHAIN_MULTIPLIER_CAP, CHAIN_STEP, LIVES_BONUS_RATE, PAR_TIME_PER_HIT_MS, PERFECT_BONUS_RATE, TIME_BONUS_MAX_RATE } from '../config';
import type { PlacedBrick } from './levels';

interface LevelTotals {
  levelBase: number;
  levelHits: number;
}

/** Multiplier for the k-th brick destroyed since the ball last touched the paddle. */
export function chainMultiplier(k: number): number {
  return Math.min(1 + CHAIN_STEP * (k - 1), CHAIN_MULTIPLIER_CAP);
}

/** Points for one destroyed brick: base × chain × risk. */
export function brickPoints(base: number, chainMul: number, risk: number): number {
  return Math.round(base * chainMul * risk);
}

/** Sum of base points and hits over every brick in a level. */
export function levelTotals(bricks: PlacedBrick[]): LevelTotals {
  const levelBase = bricks.reduce((totalPoints, brick) => totalPoints + brick.spec.points, 0);
  const levelHits = bricks.reduce((totalHits, brick) => totalHits + brick.spec.hits, 0);

  return { levelBase, levelHits };
}

/** Bonus for clearing a level without losing a life. */
export function perfectBonus(levelBase: number): number {
  return PERFECT_BONUS_RATE * levelBase;
}

/** Reference time to clear a level, in ms. */
export function parTime(levelHits: number): number {
  return levelHits * PAR_TIME_PER_HIT_MS;
}

/** Bonus that shrinks linearly to 0 as elapsed time reaches par. */
export function timeBonus(levelBase: number, elapsedMs: number, parTimeMs: number): number {
  return TIME_BONUS_MAX_RATE * levelBase * Math.max(0, 1 - elapsedMs / parTimeMs);
}

/** Bonus for finishing a run, based on lives left. */
export function livesBonus(livesLeft: number, runLevelBase: number): number {
  return livesLeft * LIVES_BONUS_RATE * runLevelBase;
}