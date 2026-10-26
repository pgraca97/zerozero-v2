// Shared domain types for the game + UI.

export type PowerUpType =
  | 'bullets'
  | 'fastBall'
  | 'multiball'
  | 'slowBall'
  | 'bigBar'
  | 'magnet'
  | 'life'
  | 'invertedCommands'
  | 'smallBar'
  | 'slowBar'
  | 'fastBar'
  | 'smallBall';

export type BrickColor =
  | 'black' | 'blue' | 'brown' | 'gold' | 'green' | 'lightblue'
  | 'orange' | 'pink' | 'purple' | 'red' | 'silver' | 'yellow';

/** A single brick's properties. */
export interface BrickSpec {
  color: BrickColor;
  hits: number;
  points: number;
}

/**
 * A level is authored as a list of row strings + a legend mapping each
 * character to a BrickSpec. ' ' and '.' are empty cells. This keeps levels
 * data-driven and trivial to add later.
 */
export interface LevelDef {
  id: string;
  name: string;
  rows: string[];
  legend: Record<string, BrickSpec>;
}

/** High-level screen the React shell is showing. */
export type Screen =
  | 'loading'
  | 'menu'
  | 'levelSelect'
  | 'settings'
  | 'playing'
  | 'paused'
  | 'gameOver'
  | 'won';

/** Snapshot of an active power-up for the HUD timer. */
export interface ActivePowerUp {
  type: PowerUpType;
  /** epoch ms when it started */
  startedAt: number;
  /** total duration in ms; 0 = no timer (e.g. magnet, life) */
  durationMs: number;
}

export interface GameOverPayload {
  score: number;
  highScore: number;
  isNewHighScore: boolean;
}

export interface LevelInfo {
  index: number;
  id: string;
  name: string;
}
