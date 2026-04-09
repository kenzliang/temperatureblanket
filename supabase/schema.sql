-- Weather Checks — Supabase / Postgres schema
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New Query).
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE guards.

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- provides gen_random_uuid()

-- ────────────────────────────────────────────────
-- LOCATIONS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS locations (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  TEXT NOT NULL,
  state TEXT NOT NULL,
  lat   DOUBLE PRECISION NOT NULL,
  lon   DOUBLE PRECISION NOT NULL,
  CONSTRAINT locations_name_key UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_locations_name ON locations (name);

-- ────────────────────────────────────────────────
-- PEOPLE
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS people (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  location_id UUID NOT NULL REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT people_name_location_key UNIQUE (name, location_id)
);

CREATE INDEX IF NOT EXISTS idx_people_location_id ON people (location_id);

-- ────────────────────────────────────────────────
-- DAILY WEATHER
-- ────────────────────────────────────────────────
-- high_temp_f : daily maximum temperature in Fahrenheit (converted from °C)
-- precip_in   : total precipitation in inches (converted from mm / 25.4)
-- snowfall_cm : snowfall in centimetres (Open-Meteo native unit)
-- rained      : precip_in > threshold AND NOT snowed
-- snowed      : snowfall_cm > 0
-- raw         : full Open-Meteo JSON response (for debugging / re-processing)

CREATE TABLE IF NOT EXISTS daily_weather (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  d           DATE        NOT NULL,
  location_id UUID        NOT NULL REFERENCES locations (id) ON DELETE CASCADE,
  high_temp_f DOUBLE PRECISION,
  precip_in   DOUBLE PRECISION,
  snowfall_cm DOUBLE PRECISION,
  rained      BOOLEAN     NOT NULL DEFAULT FALSE,
  snowed      BOOLEAN     NOT NULL DEFAULT FALSE,
  raw         JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT daily_weather_d_location_key UNIQUE (d, location_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_weather_d           ON daily_weather (d);
CREATE INDEX IF NOT EXISTS idx_daily_weather_location_id ON daily_weather (location_id);

-- Auto-update updated_at on every row modification
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_daily_weather_updated_at ON daily_weather;
CREATE TRIGGER trg_daily_weather_updated_at
  BEFORE UPDATE ON daily_weather
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────
-- PERSON CHECKS
-- ────────────────────────────────────────────────
-- Uses a composite PRIMARY KEY (d, person_id) as the unique constraint.
-- The app upserts with { onConflict: 'd,person_id' } which targets this PK.
-- A separate UNIQUE constraint is NOT needed — PKs are unique by definition.

CREATE TABLE IF NOT EXISTS person_checks (
  d            DATE        NOT NULL,
  person_id    UUID        NOT NULL REFERENCES people (id) ON DELETE CASCADE,
  completed    BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (d, person_id)
);

CREATE INDEX IF NOT EXISTS idx_person_checks_d         ON person_checks (d);
CREATE INDEX IF NOT EXISTS idx_person_checks_person_id ON person_checks (person_id);

-- ────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────
-- The app uses the service role key exclusively (server-side API routes).
-- The service role bypasses RLS automatically, so no policies are needed.
-- Enabling RLS with no policies denies all access to the anon key — this is
-- defense-in-depth: if the service key were accidentally leaked, anon still
-- cannot read or write data.

ALTER TABLE locations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE people       ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_weather ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_checks ENABLE ROW LEVEL SECURITY;

-- No policies intentionally: anon access = fully denied.
