-- Add last_action_date to people table and reset streaks to -1.
-- Safe to re-run: uses IF NOT EXISTS / conditional logic.

-- Add the column (idempotent)
ALTER TABLE people ADD COLUMN IF NOT EXISTS last_action_date DATE;

-- Change streak default from 0 to -1
ALTER TABLE people ALTER COLUMN streak SET DEFAULT -1;

-- Reset all existing streaks to -1 so everyone starts fresh
-- under the new rules. They'll build back up naturally.
UPDATE people SET streak = -1, last_action_date = NULL;
