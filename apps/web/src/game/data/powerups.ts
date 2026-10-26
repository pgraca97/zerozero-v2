// Power-up metadata + drop-roll logic.
//
// The *effects* live in the Game scene (they mutate Phaser objects), but the
// metadata (label/message/timer) and spawn probabilities are pure data, ported
// faithfully from the p5 version's Brick.dropRandomPowerUp logic.

import type { PowerUpType } from '../types';

export interface PowerUpDef {
  type: PowerUpType;
  label: string;
  message: string;
  /** Shows a countdown bar in the HUD while active. */
  hasTimer: boolean;
  kind: 'attack' | 'defense' | 'challenge';
}

export const POWER_UPS: Record<PowerUpType, PowerUpDef> = {
  bullets: {
    type: 'bullets', kind: 'attack', hasTimer: true,
    label: 'Bullets', message: 'Bullets activated! Press SPACE / UP to shoot!',
  },
  magnet: {
    type: 'magnet', kind: 'attack', hasTimer: false,
    label: 'Magnet', message: 'Magnet! The ball sticks — press SPACE to launch!',
  },
  slowBall: {
    type: 'slowBall', kind: 'defense', hasTimer: true,
    label: 'Slow Ball', message: 'Slow Ball! The ball is now slower!',
  },
  bigBar: {
    type: 'bigBar', kind: 'defense', hasTimer: true,
    label: 'Big Bar', message: 'Big Bar! Your paddle is now bigger!',
  },
  life: {
    type: 'life', kind: 'defense', hasTimer: false,
    label: 'Life', message: 'Extra life!',
  },
  slowBar: {
    type: 'slowBar', kind: 'challenge', hasTimer: true,
    label: 'Slow Bar', message: 'Slow Bar! Your paddle moves slower!',
  },
  multiball: {
    type: 'multiball', kind: 'challenge', hasTimer: false,
    label: 'Multiball', message: 'Multiball! Now you have multiple balls!',
  },
  invertedCommands: {
    type: 'invertedCommands', kind: 'challenge', hasTimer: true,
    label: 'Inverted', message: 'Inverted Commands! Controls are reversed!',
  },
  smallBar: {
    type: 'smallBar', kind: 'challenge', hasTimer: true,
    label: 'Small Bar', message: 'Small Bar! Your paddle is now smaller!',
  },
  fastBall: {
    type: 'fastBall', kind: 'challenge', hasTimer: true,
    label: 'Fast Ball', message: 'Fast Ball! The ball is now super speedy!',
  },
  fastBar: {
    type: 'fastBar', kind: 'challenge', hasTimer: true,
    label: 'Fast Bar', message: 'Fast Bar! Your paddle moves faster!',
  },
  smallBall: {
    type: 'smallBall', kind: 'challenge', hasTimer: true,
    label: 'Small Ball', message: 'Small Ball! The ball is now smaller!',
  },
};

// While magnet/multiball is active, only these "neutral-ish" types drop.
const RESTRICTED_POOL: PowerUpType[] = [
  'slowBall', 'bigBar', 'life', 'fastBall',
  'invertedCommands', 'smallBar', 'slowBar', 'fastBar',
];

/**
 * Roll for a power-up drop, replicating the original probability tree.
 * Returns the type to drop, or null for no drop. `rng` yields 0..1.
 */
export function rollPowerUpDrop(
  activeType: PowerUpType | null,
  lives: number,
  maxLives: number,
  rng: () => number,
): PowerUpType | null {
  if (activeType === 'magnet' || activeType === 'multiball') {
    return RESTRICTED_POOL[Math.floor(rng() * RESTRICTED_POOL.length)];
  }

  const chance = rng();
  if (chance < 0.1) {
    // Attack: 50/50 bullets or magnet
    return rng() < 0.5 ? 'bullets' : 'magnet';
  }
  if (chance < 0.3) {
    // Defense
    const c = rng();
    if (c < 0.2) return 'slowBall';
    if (c < 0.4) return 'bigBar';
    if (lives < maxLives) return 'life';
    return null;
  }
  if (chance < 0.6) {
    // Challenge
    const c = rng();
    if (c < 0.143) return 'slowBar';
    if (c < 0.286) return 'multiball';
    if (c < 0.429) return 'invertedCommands';
    if (c < 0.571) return 'smallBar';
    if (c < 0.714) return 'fastBall';
    if (c < 0.857) return 'fastBar';
    return 'smallBall';
  }
  return null;
}
