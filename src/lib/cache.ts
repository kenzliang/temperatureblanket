import type { WeatherApiRow, CheckApiRow } from '@/types';

// Bump this when the cached data shape changes — old caches are purged automatically.
export const CACHE_VERSION = 1;

const CACHE_KEY = 'tbt_cache';
const DATE_KEY = 'tbt_last_date';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  version: number;
  timestamp: number;
  date: string;
  weather: WeatherApiRow[];
  checks: CheckApiRow[];
}

export function readCache(d: string): { weather: WeatherApiRow[]; checks: CheckApiRow[] } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: CacheEntry = JSON.parse(raw);
    if (
      cache?.version === CACHE_VERSION &&
      cache?.date === d &&
      Array.isArray(cache.weather) &&
      Array.isArray(cache.checks) &&
      Date.now() - cache.timestamp < CACHE_TTL_MS
    ) {
      return { weather: cache.weather, checks: cache.checks };
    }
    // Version mismatch or expired — purge stale cache.
    localStorage.removeItem(CACHE_KEY);
  } catch {}
  return null;
}

export function writeCache(d: string, weather: WeatherApiRow[], checks: CheckApiRow[]) {
  try {
    const entry: CacheEntry = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      date: d,
      weather,
      checks,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {}
}

export function readLastDate(min: string, max: string): string | null {
  try {
    const d = localStorage.getItem(DATE_KEY);
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= min && d <= max) return d;
  } catch {}
  return null;
}

export function writeLastDate(d: string) {
  try { localStorage.setItem(DATE_KEY, d); } catch {}
}
