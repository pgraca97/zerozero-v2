# CLAUDE.md

@AGENTS.md

ZeroZero v2: a brick-breaker game (Vite + React 19 + TypeScript + Phaser 4, Arcade physics). pnpm workspaces + Turborepo monorepo; the game is `apps/web` (`@zerozero/web`). No backend yet, so persistence is localStorage only. v1 is frozen in the separate `pgraca97/zerozero` repo.

## Commands

Run from the repo root:

```bash
pnpm install      # fresh checkout
pnpm dev          # Vite dev server on http://localhost:5173/
pnpm typecheck    # tsc --noEmit: the real type gate, run after edits
pnpm build        # transpile only, does NOT check types
pnpm test:e2e     # Playwright; auto-starts the dev server
pnpm check        # done gate: typecheck + build, then e2e
```

- `pnpm check` runs e2e after the build on purpose. Running them in parallel starves the dev server and flakes the power-up test.
- Single e2e test, from `apps/web/`: `pnpm exec playwright test -g "boots to the menu"` or `pnpm exec playwright test tests/smoke.spec.ts:27`.
- Add a dependency: `pnpm --filter @zerozero/web add <pkg>`.

## Architecture rules

- **React owns all UI; Phaser owns only the gameplay canvas.** They never import each other. The only bridge is the typed `EventBus` (`apps/web/src/game/EventBus.ts`): Phaser emits state events, React emits `cmd-*` commands.
- **Never add a value `import Phaser` to anything reachable from `App.tsx`.** Phaser is lazy-loaded in `PhaserGame.tsx` so React paints first; a static import would pull it back into the entry chunk. `import type` is fine.
- **No `<StrictMode>`.** Its dev double-mount would create and destroy the `Phaser.Game`.
- **The `Game` scene starts once and is never restarted.** `cmd-start` calls `startLevel()`, which clears groups and rebuilds. EventBus listeners are registered once in `create()`. The `phase` field (`idle | playing | over`) gates `update()`.
- **Fixed virtual resolution 480×640 with `Scale.FIT`.** Author every position, size and velocity in virtual px in `config.ts`. There is no scale-factor math.

## Physics conventions

- Dynamic bodies (Ball, Paddle, PowerUp, Bullet) follow `setDisplaySize`. Static bodies (Brick) need `body.updateFromGameObject()` after any size or texture change.
- The paddle bounce is custom angle logic (`Ball.bounceOffPaddle`: hit offset plus paddle-velocity "english"), not physics reflection. Preserve that feel.
- Ball speed = `baseSpeed` (ramps per paddle hit) × `speedMul` (power-ups). `normalizeSpeed()` also enforces a minimum pitch so the ball can't loop horizontally.
- Arcade runs at `fps: 120` to avoid tunneling.
- Type bodies with `declare body: Phaser.Physics.Arcade.Body`. Import Phaser as `import Phaser from 'phaser'`.

## Content and conventions

- **Levels** (`src/game/data/levels.ts`): row strings plus a legend mapping chars to `BrickSpec`. Adding a level is one `LEVELS` entry. `UNLOCKED_LEVELS` gates which levels are playable.
- **Add a power-up**: extend `PowerUpType` (`types.ts`), add a `POWER_UPS` entry (`powerups.ts`), then handle it in `applyEffect` and `clearActivePowerUp` (`Game.ts`). The sprite key comes from `POWER_UP_FILE` in `config.ts`.
- Only one timed power-up is active at a time; applying a new one clears the previous. `life` is instant, `magnet` lasts until launch, the rest last 8 s.
- **Keep the localStorage key `zerozero_highscore` unchanged.** Existing players' scores depend on it.
- Audio is raw Web Audio (`src/game/audio.ts`), not the Phaser loader. `audio.ensure()` must run inside a user gesture.
- Images live in `apps/web/public/assets/`; load them through `assetUrl()`. Fonts `ArcadeClassic` and `DePixelBreit` are declared in `src/ui/ui.css` and used by both React and Phaser text.
- Gameplay announcements for screen readers go through `announce()` (`src/state/announce.ts`).
- DEV-only code is gated by `import.meta.env.DEV`. In dev builds, `P` spawns the next power-up at the center, and `window.__ZZ_GAME__` exposes the Game scene for Playwright `page.evaluate`.

## Dependency pins

- `@vitejs/plugin-react` stays on `^4` (v6 requires Vite 7).
- pnpm builds esbuild via `allowBuilds` in `pnpm-workspace.yaml`.

## Testing

- Specs live in `apps/web/tests/`. Only chromium is enabled locally; firefox and webkit are commented out in `playwright.config.ts`.
- Tests fail on any console or page error, so keep the console clean.
- CI (`.github/workflows/ci.yml`) runs `pnpm check` on push and PR to `main`.

## Hosting

Cloudflare Workers static assets (`wrangler.jsonc`, serving `apps/web/dist`). Cloudflare deploys on push to `main` and builds a preview URL per branch; CI does not deploy. Base path is `/`; set `VITE_BASE` at build time for sub-path hosting.

## Design docs

- `docs/scoring.md`: scoring rules and run model (designed, not implemented yet).
- `docs/backend.md`: Supabase auth + leaderboard outline (not built).
- Add `packages/shared` and `supabase/` only when backend work starts.
