# Scoring

Status: **designed, not implemented.** Replaces the current scoring (brick points + `lives × 50` level bonus).

## Goals

- Clearing a level should not give everyone the same score: skill must separate players.
- Reward, roughly by weight: **combos** › **survival** › **speed** › **risk**.
- The player can see where points come from (HUD multiplier + end-of-level breakdown).
- Rules live in a pure module (no Phaser, storage or EventBus) so the future backend can reuse them for score plausibility checks.

## Competition model

- **Run**: levels played in order with one shared pool of lives. Main leaderboard = best run score.
- **Single level** (level select): standalone play. Counts only towards that level's best score.

## Rules

### Brick points

Awarded when a brick is **destroyed**:

```
points = round(basePoints × chainMultiplier × riskMultiplier)
```

`basePoints` is `BrickSpec.points` (currently 100 × hits).

**Chain (combo)**: each ball keeps its own chain, which counts the bricks destroyed since it last touched the paddle. The k-th brick in a chain gets:

```
chainMultiplier(k) = min(1 + 0.5 × (k − 1), 3)
```

| k | 1 | 2 | 3 | 4 | 5+ |
|---|---|---|---|---|---|
| multiplier | ×1 | ×1.5 | ×2 | ×2.5 | ×3 |

- A ball's chain resets when it touches the paddle (top or side), is caught by the magnet, or is lost.
- Walls and ceiling do not reset the chain.
- A hit that doesn't destroy the brick neither counts towards the chain nor resets it.
- Multiball: chains are per ball. One ball touching the paddle doesn't affect the others.

**Risk**: applies while a challenge power-up is active:

| Group | Power-ups | Multiplier |
|---|---|---|
| Hard | `invertedCommands`, `smallBar`, `fastBall`, `smallBall` | ×2 |
| Light | `slowBar`, `fastBar` | ×1.5 |
| None | `multiball`, all attack/defense power-ups | ×1 |

Defense power-ups don't reduce points.

**Bullets**: a brick destroyed by a bullet always scores `basePoints` (no chain, no risk). Only one timed power-up is active at a time, so bullets and risk never overlap anyway.

The highest possible per-brick multiplier is ×6.

### Level-end bonuses

These are granted only when the level is **cleared**. Chain and risk multipliers don't apply to them.

```
levelBase  = sum of basePoints of all bricks in the level
levelHits  = sum of hits of all bricks in the level
parTime    = levelHits × 2 s

perfectBonus = 0.25 × levelBase                                  (no lives lost this level)
timeBonus    = 0.5  × levelBase × max(0, 1 − elapsed / parTime)
```

- The level clock starts at the first launch in the level.
- Pause time is excluded.
- Time between losing a life and relaunching counts.

**Level score** = brick points + perfect bonus + time bonus.

| Level | levelBase | levelHits | parTime |
|---|---|---|---|
| Classic | 21 600 | 216 | 432 s |
| Pyramid | 8 600 | 86 | 172 s |
| Minefield | 5 800 | 58 | 116 s |

### Run

- Starts at level 0 with `START_LIVES`.
- Lives carry over between levels unchanged. There is no refill; the `life` power-up is the only way back up to `MAX_LIVES`.
- **Run score** = sum of level scores.
- Game over mid-level: that level contributes its brick points only, with no bonuses.
- Completing every unlocked level adds:
  ```
  livesBonus = livesLeft × 0.10 × sum of levelBase over the run's levels
  ```
- Only Classic is unlocked for now (`UNLOCKED_LEVELS = 1`), so a run is currently one level.

### Single level

- Always starts with `START_LIVES`.
- Uses the same level score formula, with no lives bonus.

### Difficulty

Initial ball speed depends on the level's **position in `LEVELS`**, never on run progress. A level therefore plays the same in a run and standalone, which keeps per-level scores comparable.

```
initialSpeed = BALL_SPEED × (1 + 0.05 × levelIndex)
```

The per-paddle-hit ramp (`BALL_SPEED_RAMP`, `BALL_SPEED_RAMP_CAP`) is unchanged.

## Constants (`config.ts`)

| Meaning | Value |
|---|---|
| chain step | 0.5 |
| chain cap | 3 |
| perfect bonus | 0.25 × levelBase |
| max time bonus | 0.5 × levelBase |
| par time per hit | 2 s |
| run lives bonus per life | 0.10 × run levelBase |
| speed increase per level | 0.05 |

Per-power-up risk multipliers live in `POWER_UPS` (`powerups.ts`), default 1.

## Persistence (localStorage)

| Key | Holds | Updated when |
|---|---|---|
| `zerozero_highscore` (**name unchanged**) | best run score | a run ends (game over or completed) |
| `zerozero_level_bests` (new) | `{ [levelId]: bestScore }` (JSON) | a level is **cleared**, in a run or standalone |

## UI

- **HUD**: current multiplier (e.g. `×2.5`), hidden at ×1. With several balls, show the highest `chainMultiplier(k) × riskMultiplier` among balls in play.
- **Level cleared**: breakdown of brick points, perfect bonus, time bonus (elapsed vs par) and level total. Inside a run, also show the running run total.
- **Run end**: run total, lives bonus (if any), new-best badge.

### Screen flow

| Situation | Actions |
|---|---|
| Run: level cleared, next exists | Next Level, Menu |
| Run: last level cleared | run summary, Play Again (new run), Menu |
| Run: game over | Retry (new run from level 0), Menu |
| Single: level cleared | Replay, Menu |
| Single: game over | Retry (same level), Menu |
| Pause → Restart | restart the current mode |

There is no "Replay" mid-run, because replaying a level inside a run would let the player farm score without risk.

## Contracts

### Events

- New `multiplier-changed: number` (Phaser → React).
- `cmd-start` carries a mode (`run`, or `single` + `levelIndex`) instead of `keepScore`. A separate command continues a run to the next level.
- `level-won` carries a `LevelResult`; the run end carries a `RunResult`.

### Results

These are also the shapes the backend will receive.

```ts
interface LevelResult {
  levelId: string;
  completed: boolean;
  brickPoints: number;
  perfectBonus: number;
  timeBonus: number;
  elapsedMs: number;
  parTimeMs: number;
  total: number;
}

interface RunResult {
  levels: LevelResult[];
  livesBonus: number;
  total: number;
}
```

## Plausibility bound (for the backend)

A level score can never exceed `6.75 × levelBase`:

```
6 × levelBase    (max multiplier on every brick)
+ 0.25 × levelBase  (perfect bonus)
+ 0.5 × levelBase   (max time bonus)
```

Submissions above this, or with an impossible `elapsedMs`, can be rejected.

## Done when

- [ ] Brick points use chain × risk; bullets score base only
- [ ] Chain is per ball and resets on paddle touch, magnet catch and ball loss
- [ ] Risk multiplier is defined per power-up in `POWER_UPS`
- [ ] The level clock excludes pause and starts at the first launch
- [ ] Perfect and time bonuses replace `lives × 50`
- [ ] Lives carry over within a run, and reset for a new run or a single level
- [ ] The lives bonus is applied on run completion
- [ ] Initial ball speed scales with level index
- [ ] `zerozero_highscore` holds the run best; `zerozero_level_bests` holds cleared-level bests
- [ ] HUD multiplier, level breakdown and run summary are shown
- [ ] The screen flow matches the table above
- [ ] Scoring rules live in a pure module
- [ ] `pnpm check` passes

## Out of scope

- Floating per-brick score text (juice)
- Fewer defense drops on later levels
- Seeded RNG and a daily challenge mode
- Auth and online leaderboard (separate design, see [backend.md](backend.md))
- Tuning: all numbers are constants and get adjusted after playtesting
