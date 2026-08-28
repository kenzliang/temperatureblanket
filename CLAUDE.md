# CLAUDE.md

Guidance for working in this repo. Read this before making changes.

## What this is

A **Temperature Blanket Tracker** — a Next.js (App Router) web app that records the
daily high temperature for four locations and lets each person check off the day
once they've knitted/crocheted that day's color. Weather comes from the
[Open-Meteo](https://open-meteo.com) API; data lives in **Supabase** (Postgres).
Deployed on **Vercel**.

The four locations and the people live in the database (`locations`, `people`),
**not** in code — adding one is a DB insert, no deploy needed.

## ⚠️ This checkout has drifted before

The Vercel production app deploys from GitHub `origin/main`. A local clone here was
once far behind (stuck on an obsolete Vite version while prod had moved to Next.js).
**Before starting work, confirm you're current:** `git fetch && git log --oneline origin/main -1`
should match `HEAD`. If `git status` shows unrelated junk (XML files, Rekordbox
scripts, etc.), those are not part of this project — ignore them.

`node_modules` may also be stale; run `npm install` if `tsc`/`next` can't resolve modules.

## Architecture

- `src/app/page.tsx` — thin client orchestrator. Holds the selected `date` (ET),
  wires hooks to components.
- `src/hooks/` — `useWeatherData` (per-date weather + checks + toggle + backfill),
  `useStats` (per-year calendar/progress/trends).
- `src/components/` — `DateNav` (date picker + arrows + Yesterday/Today), `LocationGrid`/
  `LocationCard`, `CalendarHeatmap`, `ProgressTracker`, `IncompleteDates`, `Sparkline`, etc.
- `src/app/api/` — route handlers:
  - `weather`, `checks`, `stats` — read APIs the UI calls.
  - `jobs/fetch-yesterday` — **cron**, fetches yesterday's weather for all locations.
  - `jobs/backfill` — fetch a date range (`?start=&end=`).
  - `jobs/check-streaks` — **cron**, resets stale streaks.
- `src/lib/weather.ts` — shared Open-Meteo fetch + DB upsert logic used by the jobs.
- `src/lib/dates.ts` — **all date math goes through here.** ET-correct helpers.
- `src/lib/streak.ts`, `src/lib/yarn-colors.ts` — streak rules and per-person color maps.
- `supabase/schema.sql`, `supabase/migrations/` — DB schema.

## Critical conventions (don't relearn these the hard way)

- **Dates are `YYYY-MM-DD` strings in America/New_York**, everywhere. Never
  `new Date().toISOString().slice(0,10)` (that's UTC — wrong after ~8pm ET). Use
  the helpers in `src/lib/dates.ts`. Never set `process.env.TZ` (Vercel reserves it).
- **The date picker is a controlled native `<input type="date">`** (`value={date}`).
  Update `date` **synchronously** on change — deferring it (e.g. via `setTimeout`)
  makes the open calendar snap back to the old month. See `changeDate` in `page.tsx`.
- **`rained` = `precipIn > PRECIP_THRESHOLD_IN (0.05") && !snowed`.** The `!snowed`
  guard matters: snowfall melts into `precipitation_sum`, so without it snowy days
  read as rainy. See `computeWeatherFields`.
- **Open-Meteo fetch order: forecast API first, archive API on a 400.** The archive
  API lags 2–5 days, so it can't be used alone for recent dates.
- **`person_checks` upserts use `ignoreDuplicates: true`** so a re-run of the cron
  never resets a `completed=true` back to false.
- **Jobs fetch all locations concurrently** (`Promise.allSettled`), not in a loop.
  Sequential fetches with retries summed past the Vercel timeout and silently
  dropped the last locations (this caused the 2026-06-10 gap). Keep it parallel,
  and keep collecting per-location errors → respond `207` on partial failure.
- **Any un-filtered `person_checks`/`daily_weather` query spanning a whole year
  must paginate with `.range()`.** Supabase/PostgREST caps a single request at
  a server-configured max row count (1000 by default) with no error — it just
  silently truncates. `people × days` blows past 1000 well before year-end.
  `/api/stats` uses a `fetchAllRows()` helper that pages until a page comes
  back short; requires a stable `.order()` on the query or pages can skip/
  overlap rows. `src/lib/local-db.ts` (local Postgres dev) implements
  `.range()` too — keep it in sync if you add another paginated query.
- **A person who stops participating is soft-hidden, not deleted.** `people.active`
  (default `true`) is filtered to `active = true` everywhere people are queried
  (`checks`, `stats`, and the daily-row creation in `weather.ts`). Setting it
  `false` stops new `person_checks` rows and hides them from the UI while
  keeping their history intact — set it via a direct `UPDATE` in the Supabase
  SQL editor, the same way people/locations are added.

## Data backfill / repair

To fill a missing day, call the backfill job:
`GET /api/jobs/backfill?start=YYYY-MM-DD&end=YYYY-MM-DD` (auth required in prod).
For a single ad-hoc fix you can also hit `fetch-yesterday?date=YYYY-MM-DD`.
The Supabase project is `tempblanket` (ref `gwhqnpicxtppsqznclig`); tables of note:
`locations`, `people`, `daily_weather` (PK `d,location_id`), `person_checks` (`d,person_id`).

## Environment

Server-side only — see `.env.example`. Key vars: `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY` (all DB access is service-role, server-side),
`BASIC_AUTH_USER`/`BASIC_AUTH_PASS` (browser gate via `middleware.ts`),
`CRON_SECRET` (Bearer token for cron/manual job calls), `PRECIP_THRESHOLD_IN`.

## Crons (`vercel.json`, UTC)

- `0 10 * * *` → `fetch-yesterday` (~6am ET)
- `0 11 * * *` → `check-streaks`

## Verify before pushing

```bash
npm install      # if deps look stale
npx tsc --noEmit
npm run build
```

## Agentic tooling (`.claude/`)

- `/verify` — runs the checklist above.
- `/backfill` — walks through the backfill job (see "Data backfill / repair"),
  asks for a date range, and confirms before hitting prod.
- `pitfall-reviewer` subagent — checks a diff against this repo's specific
  previously-shipped bugs (ET/UTC dates, the `rained`/`!snowed` guard,
  sequential-vs-parallel job fetches, `person_checks` upsert dedup, the date
  picker snap-back). Invoke it before committing changes to `src/lib/dates.ts`,
  `src/lib/weather.ts`, `src/app/api/jobs/*`, or `DateNav.tsx`/`page.tsx`.

Unrelated files that show up in `git status` (Rekordbox scripts/XML, an old
pre-Next.js starter scaffold) live in `archive/`, which is gitignored — leave
them there.
