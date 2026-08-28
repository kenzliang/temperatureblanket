---
description: Run the pre-push checklist from CLAUDE.md (install if stale, typecheck, build)
---

Run the "Verify before pushing" checklist from CLAUDE.md:

1. Run `git status` first, note anything unexpected (uncommitted work, stray
   files outside `src/`, `supabase/`, config — per CLAUDE.md, junk unrelated to
   this project may show up in a drifted checkout; ignore it, don't touch it).
2. If `node_modules` looks stale or `tsc`/`next` can't resolve modules, run
   `npm install`.
3. Run `npx tsc --noEmit`. Fix any type errors before continuing.
4. Run `npm run build`. Fix any build errors before continuing.

Report pass/fail for each step. Do not commit or push as part of this command —
just verify and report.
