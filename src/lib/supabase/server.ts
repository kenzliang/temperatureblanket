/**
 * Database client — used by all server-side code (Route Handlers, job routes).
 * Never import this from a 'use client' component.
 *
 * Two modes, selected by environment variables:
 *
 *   LOCAL DEV  → set DATABASE_URL (docker-compose)
 *                Uses a plain Postgres connection via the `pg` package.
 *
 *   PRODUCTION → set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *                Uses the official Supabase JS client (service role).
 *
 * The client is created lazily on first access so that the build step
 * (which has no env vars) doesn't throw at import time.
 */

import { localDb } from '../local-db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any = null;

function getDb() {
  if (_db) return _db;

  if (process.env.DATABASE_URL) {
    _db = localDb;
  } else {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      throw new Error(
        'Database not configured. ' +
          'For local dev: set DATABASE_URL in .env.local (see docker-compose.yml). ' +
          'For production: set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.'
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@supabase/supabase-js');
    _db = createClient(url, serviceKey, { auth: { persistSession: false } });
  }

  return _db;
}

// Proxy that lazily initializes the client on first property access
export const supabase = new Proxy({} as any, {
  get(_target, prop) {
    return getDb()[prop];
  },
});
