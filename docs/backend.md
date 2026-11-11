# Backend design (deferred - pre-reference)

Status: **not built.** Design outline for the online layer. Nothing here is wired yet; the game runs fully on localStorage.

## Goal

Add an online layer (global leaderboard first) **without** giving up static hosting on Cloudflare Workers and **without** rewriting the game. The persistence seam already exists: [storage.ts](../apps/web/src/state/storage.ts) isolates localStorage, and the `Game` scene already emits `game-over` / `level-won` with the final score over the EventBus. That is where a submit hooks in.

## Why Supabase

Hosted Postgres + auto REST API + Auth + Realtime + Edge Functions, with a browser SDK and a generous free tier. The SDK talks **directly from the browser** (secured by Row Level Security), so there is no server to run and the static Workers deploy keeps working. SQL + realtime + RLS fit a leaderboard better than Firebase's NoSQL; a bespoke API would be more upkeep for no gain at this size.

## Architecture fit

```
Phaser Game ──emit('game-over' | 'level-won', {score, levelId})──► EventBus
                                                                      │
                                          (new) src/state/leaderboard.ts listens
                                                                      │
                       ┌──────────────────────────────────────────────┤
                       ▼                                                ▼
        src/state/supabase.ts (createClient)                 src/state/storage.ts
        submitScore() / getTopScores()                       (local best, offline cache/fallback)
```

- Keep localStorage as the **offline cache + personal best**; Supabase is additive, never a hard dependency (game must still play offline).
- New React screen `leaderboard` (add to the `Screen` union in [types.ts](../apps/web/src/game/types.ts)) fetches and renders top scores.
- All network code lives under `src/state/` (or a new `src/services/`); the game scene stays backend-agnostic and keeps only emitting events.

## Data model (Phase 1: anonymous leaderboard)

> Predates [scoring.md](scoring.md), which settles on run scores plus per-level bests (`RunResult` / `LevelResult`). Revise this schema to match before building Phase 1.

```sql
create table public.scores (
  id          uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 1 and 24),
  score       integer not null check (score >= 0 and score <= 1000000),
  level_id    text not null,                       -- matches LevelDef.id ('classic', ...)
  user_id     uuid references auth.users(id) on delete set null,  -- null while anonymous
  created_at  timestamptz not null default now()
);
create index scores_leaderboard_idx on public.scores (level_id, score desc);

alter table public.scores enable row level security;

-- Anyone may read the leaderboard.
create policy "scores readable" on public.scores
  for select using (true);

-- MVP: allow anonymous inserts; the CHECK constraints bound the values.
-- (Tighten later, see Anti-cheat.)
create policy "scores insertable" on public.scores
  for insert with check (true);
```

### Phase 2: accounts (optional)
```sql
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text unique,
  best_score   integer not null default 0,
  created_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles readable" on public.profiles for select using (true);
create policy "own profile writable" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
```
Auth flow: start **anonymous** (`supabase.auth.signInAnonymously()`), let players optionally link email/OAuth later so their scores carry over.

## Client integration sketch

```ts
// src/state/supabase.ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

// src/state/leaderboard.ts
export async function submitScore(name: string, score: number, levelId: string) {
  await supabase.from('scores').insert({ player_name: name, score, level_id: levelId });
}
export async function getTopScores(levelId: string, limit = 10) {
  const { data } = await supabase
    .from('scores').select('player_name, score, created_at')
    .eq('level_id', levelId).order('score', { ascending: false }).limit(limit);
  return data ?? [];
}
```

The `VITE_SUPABASE_ANON_KEY` is **public-safe** (RLS is the real guard); it gets inlined at build time. Set both `VITE_` vars as build variables in the Cloudflare Workers build settings (never the service-role key). Add `.env.local` to `.gitignore` for local dev.

## Anti-cheat (decide before "real" leaderboards)

A browser-direct insert is trivially spoofable: anyone can POST any score. Mitigation ladder, cheapest first:
1. **MVP / accept it**: CHECK constraints + RLS. Fine for a hobby board; expect some junk.
2. **Edge Function gate**: deny direct table insert; submit through a Supabase Edge Function that validates (range, plausibility, rate-limit per IP/session).
3. **Signed runs**: client sends score + an HMAC over a server-issued session nonce; function verifies.
4. **Server replay** (overkill): submit the input log; server simulates the run deterministically and computes the score. Requires a headless/deterministic core, which is a rabbit hole.

## Phasing

- **Phase 0 (now):** localStorage only. Seam ready. ✅
- **Phase 1 (MVP, ~half day):** anonymous global leaderboard: name prompt on game-over, `submitScore`, a top-10 React screen per level. Accept cheat risk (#1).
- **Phase 2:** auth (anon → linked), per-user best, cloud-synced settings/progress.
- **Phase 3:** realtime leaderboard (`supabase.channel(...).on('postgres_changes', ...)`).
- **Phase 4:** custom/shared levels + daily challenge (store `LevelDef` JSON + a daily seed; reuses the data-driven level system).

## Open decisions

- ~~Per-level boards vs one global board~~: decided in [scoring.md](scoring.md) (run board + per-level bests).
- Name entry: one-off prompt (anonymous) vs requiring a profile.
- Anonymous-allowed vs login-required to submit.
- Free-tier limits / project region.

## Setup checklist (when starting Phase 1)

1. Create a Supabase project; copy Project URL + anon key.
2. `pnpm add @supabase/supabase-js`.
3. `.env.local`: `VITE_SUPABASE_URL=...`, `VITE_SUPABASE_ANON_KEY=...` (gitignore it).
4. Run the Phase-1 SQL (table + RLS) in the Supabase SQL editor.
5. Add `src/state/supabase.ts` + `src/state/leaderboard.ts`; hook `submitScore` to a `game-over`/`level-won` listener.
6. Add the `leaderboard` screen + a "Leaderboard" menu button.
7. Add the `VITE_` vars to the Cloudflare Workers build settings so the deployed build ships them.
