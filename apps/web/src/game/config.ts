// Central gameplay constants + asset manifest.
//
// The game runs at a FIXED virtual resolution and Phaser's Scale.FIT scales it
// to the window. This removes all the manual `* scaleFactor` math the p5 version
// needed — positions/velocities are authored once in virtual units.

import type { BrickColor, PowerUpType } from './types';

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 640;
export const BG_COLOR = '#0d0c13';

// --- Playfield walls (virtual px inset from canvas edge) ---
export const WALL_X = 8;
export const WALL_TOP = 8;
export const BRICK_TOP_OFFSET = 70; // gap below top wall before bricks start

// --- Ball ---
export const BALL_SPEED = 330;        // px/sec (≈ 5.5 px/frame @60fps in old game)
export const BALL_DIAMETER = 22;
export const BALL_DIAMETER_SMALL = 12;
export const LAUNCH_DELAY = 2500;     // auto-launch after this long stuck to paddle
export const MAX_BALL_SPEED = 720;
export const MIN_BALL_SPEED = 120;
// Rally speed ramp: each paddle hit nudges the ball's base speed up so long
// rallies build tension. Resets on each new serve (new Ball instance).
export const BALL_SPEED_RAMP = 6;         // px/s added per paddle hit
export const BALL_SPEED_RAMP_CAP = 500;   // base speed never ramps past this
// Minimum angle from horizontal the ball is allowed to travel at. Without it
// the ball can settle into a near-flat wall-to-wall loop that never comes down.
export const MIN_BALL_PITCH = (20 * Math.PI) / 180;

// --- Paddle bounce feel ---
// Continuous angle: hit offset from paddle center (-1..1) maps to exit angle.
export const PADDLE_MAX_BOUNCE = (60 * Math.PI) / 180; // at the very edge
export const PADDLE_BOUNCE_SHAPE = 1.25; // >1 flattens center, sharpens edges
// "English": paddle horizontal velocity tilts the exit angle (rad per px/s),
// capped so a fast swipe can't flatten the shot.
export const PADDLE_ENGLISH = 0.0005;
export const PADDLE_ENGLISH_MAX = (14 * Math.PI) / 180;

// --- Paddle ---
export const PADDLE_SPEED = 360;      // px/sec (keyboard)
export const PADDLE_Y_OFFSET = 36;    // from bottom
export const PADDLE_H = 18;
export const PADDLE_W = { normal: 84, big: 120, small: 54 } as const;

// --- Misc object display sizes (virtual px) ---
export const POWERUP_SIZE = 24;
export const BULLET_W = 6;
export const BULLET_H = 16;

// --- Power-ups ---
export const POWER_UP_DURATION = 8000;
export const POWER_UP_FALL_SPEED = 120;
export const DROP_CHECK_INTERVAL = 1500;
export const MAX_POWER_UPS_TO_DROP = 3;
export const MAX_LIVES = 5;

// --- Bullets ---
export const SHOOT_INTERVAL = 300;
export const BULLET_SPEED = 360;

export const START_LIVES = 3;

export const BRICK_COLORS: BrickColor[] = [
  'black', 'blue', 'brown', 'gold', 'green', 'lightblue',
  'orange', 'pink', 'purple', 'red', 'silver', 'yellow',
];

// Power-up type -> sprite file stem (assets/Powerups/<stem>.png)
export const POWER_UP_FILE: Record<PowerUpType, string> = {
  bullets: 'bullets',
  fastBall: 'fast_ball',
  multiball: 'multiball',
  slowBall: 'slow_ball',
  bigBar: 'big_bar',
  magnet: 'magnet',
  life: 'life',
  invertedCommands: 'inverted_commands',
  smallBar: 'small_bar',
  slowBar: 'slow_bar',
  fastBar: 'fast_bar',
  smallBall: 'small_ball',
};

// --- Asset keys (referenced by scenes/objects) ---
export const TEX = {
  frame: 'frame',
  title: 'title',
  arrow: 'arrow',
  life: 'life',
  paddle: 'paddle',
  paddleBig: 'paddleBig',
  paddleSmall: 'paddleSmall',
  bullet1: 'bullet1',
  bullet2: 'bullet2',
  ballAnim: 'ball-anim',
  ballAnimSmall: 'ball-anim-small',
  glossAnim: 'gloss-anim',
} as const;

export const ballFrameKey = (i: number) => `ball_${i}`;
export const ballSmallFrameKey = (i: number) => `ballSmall_${i}`;
export const glossFrameKey = (i: number) => `gloss_${i}`;
export const brickKey = (c: BrickColor) => `brick_${c}`;
export const brickBrokenKey = (c: BrickColor) => `brickBroken_${c}`;
export const powerUpKey = (t: PowerUpType) => `pu_${t}`;
export const starKey = (c: 'blue' | 'green' | 'red') => `star_${c}`;

const BASE = import.meta.env.BASE_URL; // '/' unless VITE_BASE overrides it
export const assetUrl = (rel: string) => `${BASE}assets/${rel}`;

export interface ImageAsset {
  key: string;
  path: string;
}

/** Every still image Phaser must load during Preload. */
export function buildImageManifest(): ImageAsset[] {
  const list: ImageAsset[] = [
    { key: TEX.frame, path: 'newFrame.png' },
    { key: TEX.title, path: 'zerozero.png' },
    { key: TEX.arrow, path: 'Arrow.png' },
    { key: TEX.life, path: 'Life.png' },
    { key: TEX.paddle, path: 'Paddle/paddle_4_mid_silver.png' },
    { key: TEX.paddleBig, path: 'Paddle/paddle_4_large_silver.png' },
    { key: TEX.paddleSmall, path: 'Paddle/paddle_4_silver.png' },
    { key: TEX.bullet1, path: 'bullet1.png' },
    { key: TEX.bullet2, path: 'bullet2.png' },
  ];

  for (let i = 0; i < 4; i++) {
    list.push({ key: ballFrameKey(i), path: `Ball/ball_3_blue_${i + 1}.png` });
    list.push({ key: ballSmallFrameKey(i), path: `Ball/Smaller/ball_3_blue_${i + 1}.png` });
  }
  for (let i = 0; i < 3; i++) {
    list.push({ key: glossFrameKey(i), path: `Blocks/gloss_animation/gloss_animation_${i + 1}.png` });
  }
  for (const c of BRICK_COLORS) {
    list.push({ key: brickKey(c), path: `Blocks/block_2_mid_${c}.png` });
    list.push({ key: brickBrokenKey(c), path: `Blocks/block_broken_2_mid_${c}.png` });
  }
  for (const t of Object.keys(POWER_UP_FILE) as PowerUpType[]) {
    list.push({ key: powerUpKey(t), path: `Powerups/${POWER_UP_FILE[t]}.png` });
  }
  for (const c of ['blue', 'green', 'red'] as const) {
    list.push({ key: starKey(c), path: `Corpos Celestes/Star_${c[0].toUpperCase()}${c.slice(1)}.png` });
  }
  return list;
}
