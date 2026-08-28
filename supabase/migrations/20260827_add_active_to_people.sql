-- Add an `active` flag to people so someone who stops participating can be
-- hidden from the app (checklist, progress, streaks) without deleting their
-- history. Safe to re-run: uses IF NOT EXISTS.

ALTER TABLE people ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_people_active ON people (active);

-- Colleen (Windham) and Steph (Quincy) are not doing the project — hide them
-- from the render. Their existing daily_weather/person_checks history is
-- untouched.
UPDATE people SET active = false WHERE name IN ('Colleen', 'Steph');
