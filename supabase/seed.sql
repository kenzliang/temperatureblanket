-- Seed data: 4 fixed locations and 6 people.
-- Safe to run multiple times — all inserts use ON CONFLICT DO NOTHING.
-- Run AFTER schema.sql.

-- ────────────────────────────────────────────────
-- LOCATIONS
-- ────────────────────────────────────────────────
INSERT INTO locations (name, state, lat, lon) VALUES
  ('Windham',    'NH', 42.809, -71.304),
  ('Concord',    'MA', 42.460, -71.350),
  ('Somerville', 'MA', 42.388, -71.099),
  ('Quincy',     'MA', 42.253, -71.002)
ON CONFLICT (name) DO NOTHING;

-- ────────────────────────────────────────────────
-- PEOPLE
-- Subselects resolve location UUIDs by name so no hardcoded IDs are needed.
-- ────────────────────────────────────────────────

-- Windham, NH
INSERT INTO people (name, location_id)
SELECT 'Haley', id FROM locations WHERE name = 'Windham'
ON CONFLICT (name, location_id) DO NOTHING;

INSERT INTO people (name, location_id)
SELECT 'Colleen', id FROM locations WHERE name = 'Windham'
ON CONFLICT (name, location_id) DO NOTHING;

INSERT INTO people (name, location_id)
SELECT 'Audrey', id FROM locations WHERE name = 'Windham'
ON CONFLICT (name, location_id) DO NOTHING;

-- Concord, MA
INSERT INTO people (name, location_id)
SELECT 'Liz', id FROM locations WHERE name = 'Concord'
ON CONFLICT (name, location_id) DO NOTHING;

-- Somerville, MA
INSERT INTO people (name, location_id)
SELECT 'Valerie', id FROM locations WHERE name = 'Somerville'
ON CONFLICT (name, location_id) DO NOTHING;

-- Quincy, MA
INSERT INTO people (name, location_id)
SELECT 'Steph', id FROM locations WHERE name = 'Quincy'
ON CONFLICT (name, location_id) DO NOTHING;
