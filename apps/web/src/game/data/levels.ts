// Data-driven level definitions. Adding a level = adding an entry here.
//
// Levels are authored as row strings + a legend. Each char is a cell; ' ' and
// '.' are gaps. `resolveLevel` turns a LevelDef into grid-placed bricks.

import type { BrickSpec, LevelDef } from '../types';
import { BRICK_COLORS } from '../config';

export interface PlacedBrick {
  col: number;
  row: number;
  spec: BrickSpec;
}

export interface ResolvedLevel {
  cols: number;
  rows: number;
  bricks: PlacedBrick[];
}

/** Rebuilds the original p5 layout: 12 rows × 6 cols, one colour per row. */
function makeClassicLevel(): LevelDef {
  const chars = 'ABCDEFGHIJKL';
  const hits = [4, 3, 2];
  const points = [400, 300, 200];
  const legend: Record<string, BrickSpec> = {};
  const rows: string[] = [];
  for (let r = 0; r < 12; r++) {
    const ch = chars[r];
    legend[ch] = { color: BRICK_COLORS[r], hits: hits[r % 3], points: points[r % 3] };
    rows.push(ch.repeat(6));
  }
  return { id: 'classic', name: 'Classic', rows, legend };
}

// Two authored levels demonstrating the data-driven shape system.
const PYRAMID: LevelDef = {
  id: 'pyramid',
  name: 'Pyramid',
  legend: {
    r: { color: 'red', hits: 3, points: 300 },
    o: { color: 'orange', hits: 2, points: 200 },
    y: { color: 'yellow', hits: 1, points: 100 },
    s: { color: 'silver', hits: 4, points: 400 },
  },
  rows: [
    '   ss   ',
    '  syys  ',
    ' soooos ',
    'srrrrrrs',
    ' soooos ',
    '  syys  ',
  ],
};

const GAPS: LevelDef = {
  id: 'gaps',
  name: 'Minefield',
  legend: {
    g: { color: 'green', hits: 2, points: 200 },
    b: { color: 'blue', hits: 2, points: 200 },
    p: { color: 'purple', hits: 3, points: 300 },
    G: { color: 'gold', hits: 4, points: 400 },
  },
  rows: [
    'g b g b g',
    ' p G p G ',
    'b g b g b',
    ' G p G p ',
    'g b g b g',
  ],
};

export const LEVELS: LevelDef[] = [makeClassicLevel(), PYRAMID, GAPS];

/** Only the first N levels are playable for now; the menu's Levels entry stays disabled until levels are designed. */
export const UNLOCKED_LEVELS = 1;

export const isLevelUnlocked = (index: number) => index >= 0 && index < UNLOCKED_LEVELS;

export function resolveLevel(def: LevelDef): ResolvedLevel {
  const cols = def.rows.reduce((m, r) => Math.max(m, r.length), 0);
  const bricks: PlacedBrick[] = [];
  for (let row = 0; row < def.rows.length; row++) {
    const line = def.rows[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      if (ch === ' ' || ch === '.') continue;
      const spec = def.legend[ch];
      if (spec) bricks.push({ col, row, spec });
    }
  }
  return { cols, rows: def.rows.length, bricks };
}
