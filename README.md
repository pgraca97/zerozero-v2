# ZeroZero v2

A browser brick-breaker game, growing from a static game into a full-stack app with accounts and an online leaderboard.

**Stack:** React 19 · TypeScript · Phaser 4 · Vite · pnpm workspaces + Turborepo · Playwright · GitHub Actions — backend (Supabase) in progress.

> Looking for the original? **v1** (React + Phaser, static) is playable at **[pgraca97.github.io/zerozero](https://pgraca97.github.io/zerozero/)** — source in [pgraca97/zerozero](https://github.com/pgraca97/zerozero).

## Structure

```
apps/web/            the game — React UI + Phaser gameplay canvas
packages/tsconfig/   shared TypeScript presets
```

## Getting started

```bash
pnpm install
pnpm dev      # http://localhost:5173/
pnpm check    # typecheck + build + e2e tests
```
