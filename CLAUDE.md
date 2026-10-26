# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

ZeroZero v2 — a brick-breaker game (**Vite + React 19 + TypeScript + Phaser 4**, Arcade physics) evolving toward frontend + backend + cloud hosting. **pnpm workspaces + Turborepo monorepo.** v1 (frozen, GitHub Pages) lives in the separate `pgraca97/zerozero` repo. Backend not built yet; persistence is still localStorage only.

## Layout

```
apps/web/            the game (React UI + Phaser canvas) — @zerozero/web
packages/tsconfig/   shared tsconfig presets (base.json, react-app.json)
turbo.json           task graph: build, typecheck, test:e2e, dev
```

Planned: `packages/shared` (types shared with backend) and `supabase/` (migrations, edge functions) — add when the backend work starts, not before.

## Commands

Run from the repo root (Turborepo fans out to workspaces):
```bash
pnpm dev          # Vite dev server → http://localhost:5173/
pnpm build        # production build to apps/web/dist/ (transpile-only; types NOT checked here)
pnpm typecheck    # tsc --noEmit — the real type gate, run this after edits
pnpm test:e2e     # Playwright e2e (auto-starts the dev server via webServer config)
pnpm check        # green-before-done gate: typecheck + build, THEN e2e
```

`pnpm check` runs e2e after build on purpose — running them in parallel starves the dev server and flakes the power-up test.

Base path defaults to `/`; set `VITE_BASE` at build time for sub-path hosting.

Run a single e2e test (from `apps/web/`):
```bash
pnpm exec playwright test -g "boots to the menu"     # by title
pnpm exec playwright test tests/smoke.spec.ts:27     # by file:line
```

Add a dependency to the game: `pnpm --filter @zerozero/web add <pkg>`.

## Architecture — the big picture

**React owns all UI; Phaser owns only the gameplay canvas. They never import each other** — the sole bridge is the typed `EventBus` ([src/game/EventBus.ts](apps/web/src/game/EventBus.ts)). Internalize this boundary before touching either side.

- **Phaser → React** (state): `loading-progress`, `preload-complete`, `score-changed`, `lives-changed`, `level-changed`, `powerup-activated`, `powerup-cleared`, `game-over`, `level-won`, `paused`, `resumed`.
- **React → Phaser** (commands): `cmd-start` `{levelIndex, keepScore?}`, `cmd-pause`, `cmd-resume`, `cmd-quit`, `cmd-mute`.

**React side** — [src/App.tsx](apps/web/src/App.tsx) is a screen state machine (`loading|menu|levelSelect|settings|playing|paused|gameOver|won`). It subscribes to EventBus on mount, renders `<PhaserGame>` (always mounted) plus screens/overlays from [src/ui/](apps/web/src/ui/). The HUD/menus are plain DOM over the canvas. `<PhaserGame>` mounts one `Phaser.Game` for the component's lifetime (no StrictMode — it would double-mount the game). **Phaser is lazy-loaded** there via `import()` so React paints first; a small plugin in [vite.config.ts](apps/web/vite.config.ts) adds `modulepreload` for lazy chunks. Never add a static `import Phaser` (value import) to anything reachable from `App.tsx` — it would pull Phaser back into the entry chunk (`import type` is fine).

**Phaser side** — scene flow `Boot → Preload → Game` ([src/game/scenes/](apps/web/src/game/scenes/)). Key point: **the `Game` scene is started once and never restarted** — it stays alive across levels and pauses. `cmd-start` calls `startLevel()` which clears groups and rebuilds; EventBus command listeners are registered once in `create()`. A `phase` field (`idle|playing|over`) gates `update()`.

**Fixed virtual resolution 480×640 + `Scale.FIT`** ([src/game/config.ts](apps/web/src/game/config.ts)). There is **no `scaleFactor` math** (the p5 version's was deleted) — author all positions/sizes/velocities in virtual px in config.ts. The canvas + HUD live in a centered `.stage` (CSS `aspect-ratio:3/4`, `max-width:520px`) so it isn't a giant full-height strip on desktop; `PhaserGame` runs a `ResizeObserver → game.scale.refresh()` so the canvas tracks the stage.

**Physics conventions** ([src/game/objects/](apps/web/src/game/objects/)): dynamic Arcade bodies (Ball/Paddle/PowerUp/Bullet) auto-track `setDisplaySize`, so size visuals with that and the body follows. Static bodies (Brick) need `body.updateFromGameObject()` after any size/texture change. The paddle bounce is **custom continuous angle logic** (`Ball.bounceOffPaddle`: hit offset → shaped angle + paddle-velocity "english"), not physics reflection — preserve that feel. Ball speed = `baseSpeed` (ramps per paddle hit) × `speedMul` (power-ups); `normalizeSpeed()` also enforces minimum pitch so the ball can't loop horizontally. Arcade runs at `fps: 120` against tunneling. Use `declare body: Phaser.Physics.Arcade.Body` to type bodies. Import Phaser as `import Phaser from 'phaser'` (works because `esModuleInterop` is on).

**Data-driven content** ([src/game/data/](apps/web/src/game/data/)):
- **Levels** (`levels.ts`): authored as row-strings + a legend mapping chars to `BrickSpec`. Adding a level = one entry in `LEVELS`. `resolveLevel()` turns it into placed bricks.
- **Power-ups** (`powerups.ts`): `POWER_UPS` metadata + `rollPowerUpDrop()` drop-probability tree (ported faithfully from the old code). Only **one timed power-up is active at a time** — applying a new one clears the previous (`applyPowerUp`/`clearActivePowerUp` switches in `Game.ts` hold the actual effects). `life` is instant; `magnet` lasts until launch (no timer); everything else is an 8s timed effect surfaced in the HUD.

**Persistence** ([src/state/storage.ts](apps/web/src/state/storage.ts)): localStorage. **Keep the key `zerozero_highscore` unchanged** — existing players' scores depend on it.

**Assets**: images in `apps/web/public/assets/` (served at `import.meta.env.BASE_URL`; load via `assetUrl()`). Audio is raw **Web Audio** ([src/game/audio.ts](apps/web/src/game/audio.ts)), not the Phaser loader — `audio.ensure()` must be called from a user gesture. Fonts are bundled from `apps/web/src/ui/fonts/` via `@font-face` in [src/ui/ui.css](apps/web/src/ui/ui.css) under families `ArcadeClassic` and `DePixelBreit` (used by both React and Phaser text).

## Conventions & gotchas

- **Add a power-up**: extend `PowerUpType` (types.ts) → add a `POWER_UPS` entry → handle it in `applyEffect`/`clearActivePowerUp` in `Game.ts` → (the sprite key is derived in config.ts from `POWER_UP_FILE`).
- **DEV-only code** is gated by `import.meta.env.DEV` (tree-shaken from prod). Press **`P`** in a dev build to cycle-spawn a power-up at center — used for manual + e2e testing. Dev builds also expose the Game scene as `window.__ZZ_GAME__` (read ball/paddle state, call scene methods from Playwright `page.evaluate`).
- **Dependency pins that matter**: `@vitejs/plugin-react` must stay on **`^4`** (v6 requires Vite 7). pnpm builds esbuild via `allowBuilds` in `pnpm-workspace.yaml`.
- Accessibility: gameplay announcements go through the `#game-announcer` live region via `announce()` ([src/state/announce.ts](apps/web/src/state/announce.ts)).

## Testing

Playwright ([playwright.config.ts](apps/web/playwright.config.ts), specs in [tests/](apps/web/tests/)). The config has a `webServer` that auto-starts `pnpm dev`, so `pnpm test:e2e` works with nothing running. **Locally only chromium is enabled** (firefox/webkit browsers aren't installed; uncomment the projects + `playwright install firefox webkit` to add them). CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs the suite on push/PR to `main`. Tests assert no console/page errors leaked, so keep the console clean.

## Roadmap

v2 focus: **backend (Supabase: auth + leaderboard)** — design outline in [docs/backend.md](docs/backend.md) · cloud hosting (Vercel or Cloudflare Pages) · then full-bleed React starfield · richer juice (brick gloss-sheet animation, typewriter messages) · game modes · more levels · dev-mode HUD overlay.

The old p5 source lives only in the v1 repo's `_legacy/` (tag `v1.0.0`).
