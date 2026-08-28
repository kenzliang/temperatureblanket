---
description: Backfill missing daily_weather/person_checks data for a date range via the backfill job
argument-hint: [start=YYYY-MM-DD] [end=YYYY-MM-DD]
---

Fill a gap in the weather data using the backfill job described in CLAUDE.md
("Data backfill / repair"): `GET /api/jobs/backfill?start=YYYY-MM-DD&end=YYYY-MM-DD`.

Arguments given: $ARGUMENTS

Steps:

1. If start/end dates weren't given above, ask the user for the `YYYY-MM-DD`
   range to backfill (or a single date, for which `fetch-yesterday?date=` is
   simpler — offer that alternative for a one-day fix).
2. Confirm which environment: local dev server (`http://localhost:3000`, no
   auth needed) or the deployed Vercel app (needs `Authorization: Bearer
   $CRON_SECRET`). **Ask before hitting the production URL** — this writes to
   the live `tempblanket` Supabase project (`daily_weather`, `person_checks`
   tables) shared by real users.
3. Once confirmed, call it, e.g.:
   ```
   curl -s "http://localhost:3000/api/jobs/backfill?start=<start>&end=<end>"
   # or, for prod:
   curl -s -H "Authorization: Bearer $CRON_SECRET" \
     "https://<prod-domain>/api/jobs/backfill?start=<start>&end=<end>"
   ```
4. Report the response, including any per-location errors (the job responds
   `207` on partial failure — surface which locations failed, don't treat 207
   as a plain success).
