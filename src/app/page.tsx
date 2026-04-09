'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LocationCard } from '@/components/LocationCard';
import { SkeletonCard } from '@/components/SkeletonCard';
import { CalendarHeatmap } from '@/components/CalendarHeatmap';
import { ProgressTracker } from '@/components/ProgressTracker';
import { IncompleteDates } from '@/components/IncompleteDates';
import { useSwipe } from '@/components/useSwipe';
import type { CheckApiRow, WeatherApiRow, StatsResponse } from '@/types';
import { todayET, yesterdayET, dataStartDate } from '@/lib/dates';

// ── localStorage helpers ──────────────────────────────────────────────────
const CACHE_KEY = 'tbt_cache';
const DATE_KEY = 'tbt_last_date';

function readCache(d: string): { weather: WeatherApiRow[]; checks: CheckApiRow[] } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    if (cache?.date === d && Array.isArray(cache.weather) && Array.isArray(cache.checks)) {
      return { weather: cache.weather, checks: cache.checks };
    }
  } catch {}
  return null;
}

function writeCache(d: string, weather: WeatherApiRow[], checks: CheckApiRow[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ date: d, weather, checks }));
  } catch {}
}

function readLastDate(min: string, max: string): string | null {
  try {
    const d = localStorage.getItem(DATE_KEY);
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= min && d <= max) return d;
  } catch {}
  return null;
}

function writeLastDate(d: string) {
  try { localStorage.setItem(DATE_KEY, d); } catch {}
}

export default function HomePage() {
  const minDate = dataStartDate();
  const maxDate = todayET();

  const [date, setDateRaw] = useState<string>(() => {
    // Can't access localStorage during SSR; this runs client-side only
    if (typeof window === 'undefined') return yesterdayET();
    return readLastDate(minDate, maxDate) ?? yesterdayET();
  });

  // Wrap setDate to also persist to localStorage
  const setDate = useCallback((d: string) => {
    setDateRaw(d);
    writeLastDate(d);
  }, []);

  // Initialize weather/checks from cache for instant render
  const [weather, setWeather] = useState<WeatherApiRow[]>(() => {
    if (typeof window === 'undefined') return [];
    return readCache(readLastDate(minDate, maxDate) ?? yesterdayET())?.weather ?? [];
  });
  const [checks, setChecks] = useState<CheckApiRow[]>(() => {
    if (typeof window === 'undefined') return [];
    return readCache(readLastDate(minDate, maxDate) ?? yesterdayET())?.checks ?? [];
  });

  // If we loaded from cache, don't show skeleton — show cached data while refreshing
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    const cached = readCache(readLastDate(minDate, maxDate) ?? yesterdayET());
    return !cached;
  });

  const [err, setErr] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);

  // Transition state for fade animation
  const [transitioning, setTransitioning] = useState(false);

  const year = date.slice(0, 4);

  // ── Day navigation ────────────────────────────────────────────────────────
  function shiftDate(days: number) {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const next = `${y}-${m}-${dd}`;
    if (next >= minDate && next <= maxDate) changeDate(next);
  }
  const canGoPrev = date > minDate;
  const canGoNext = date < maxDate;

  // Animated date change
  function changeDate(newDate: string) {
    if (newDate === date) return;
    setTransitioning(true);
    setTimeout(() => {
      setDate(newDate);
      setTransitioning(false);
    }, 150);
  }

  // Keyboard arrows
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); shiftDate(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); shiftDate(1); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Swipe gestures: swipe left = next day, swipe right = prev day
  const swipeHandlers = useSwipe(
    () => shiftDate(1),   // swipe left → forward
    () => shiftDate(-1),  // swipe right → backward
  );

  // ── Derived data ──────────────────────────────────────────────────────────

  const weatherByLoc = useMemo(() => {
    const m: Record<string, WeatherApiRow> = {};
    for (const w of weather) m[`${w.location.name},${w.location.state}`] = w;
    return m;
  }, [weather]);

  const locations = useMemo(() => {
    if (weather.length > 0) return weather.map((w) => w.location);
    const seen = new Set<string>();
    const locs: CheckApiRow['person']['location'][] = [];
    for (const c of checks) {
      const locId = c.person.location.id;
      if (!seen.has(locId)) {
        seen.add(locId);
        locs.push(c.person.location);
      }
    }
    return locs;
  }, [weather, checks]);

  const groupedChecks = useMemo(() => {
    const g: Record<string, Record<string, boolean>> = {};
    for (const c of checks) {
      const locName = c.person.location.name;
      g[locName] ??= {};
      g[locName][c.person.id] = !!c.completed;
    }
    return g;
  }, [checks]);

  const peopleByLoc = useMemo(() => {
    const g: Record<string, { id: string; name: string }[]> = {};
    for (const c of checks) {
      const locName = c.person.location.name;
      g[locName] ??= [];
      if (!g[locName].find((p) => p.id === c.person.id)) {
        g[locName].push({ id: c.person.id, name: c.person.name });
      }
    }
    return g;
  }, [checks]);

  // Trend temps by location key
  const trendsByLoc = useMemo(() => {
    const m: Record<string, (number | null)[]> = {};
    if (stats?.trends) {
      for (const t of stats.trends) m[t.key] = t.temps;
    }
    return m;
  }, [stats]);

  // ── Data fetching ─────────────────────────────────────────────────────────

  useEffect(() => {
    fetch(`/api/stats?year=${year}`)
      .then((r) => r.json())
      .then((s) => { if (s.calendar && s.progress) setStats(s); })
      .catch(() => {});
  }, [year]);

  useEffect(() => {
    let active = true;
    setErr(null);
    setBackfillMsg(null);

    // Show cached data instantly if available; otherwise show skeleton
    const cached = readCache(date);
    if (cached) {
      setWeather(cached.weather);
      setChecks(cached.checks);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // Always fetch fresh data in background
    Promise.all([
      fetch(`/api/weather?date=${date}`).then((r) => r.json()),
      fetch(`/api/checks?date=${date}`).then((r) => r.json()),
    ])
      .then(([w, c]) => {
        if (!active) return;
        const wArr = Array.isArray(w) ? w : [];
        const cArr = Array.isArray(c) ? c : [];
        setWeather(wArr);
        setChecks(cArr);
        writeCache(date, wArr, cArr);
      })
      .catch((e) => {
        if (active && !cached) setErr(e?.message ?? 'Failed to load');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [date]);

  const refreshStats = useCallback(() => {
    fetch(`/api/stats?year=${year}`)
      .then((r) => r.json())
      .then((s) => { if (s.calendar && s.progress) setStats(s); })
      .catch(() => {});
  }, [year]);

  async function toggle(personId: string, completed: boolean) {
    setChecks((prev) =>
      prev.map((c) => (c.person.id === personId ? { ...c, completed } : c))
    );
    try {
      const r = await fetch('/api/checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, personId, completed }),
      });
      if (!r.ok) throw new Error('Update failed');
      // Update cache with new checks state
      setChecks((latest) => { writeCache(date, weather, latest); return latest; });
      refreshStats();
    } catch {
      setChecks((prev) =>
        prev.map((c) =>
          c.person.id === personId ? { ...c, completed: !completed } : c
        )
      );
      alert('Failed to update check. Please try again.');
    }
  }

  // ── Auto-backfill ─────────────────────────────────────────────────────────
  async function backfillDate() {
    setBackfilling(true);
    setBackfillMsg(null);
    try {
      const r = await fetch(`/api/jobs/fetch-yesterday?date=${date}`);
      const data = await r.json();
      if (data.ok || r.ok) {
        setBackfillMsg('Weather data fetched successfully. Refreshing...');
        // Re-fetch page data
        const [w, c] = await Promise.all([
          fetch(`/api/weather?date=${date}`).then((r) => r.json()),
          fetch(`/api/checks?date=${date}`).then((r) => r.json()),
        ]);
        setWeather(Array.isArray(w) ? w : []);
        setChecks(Array.isArray(c) ? c : []);
        refreshStats();
        setBackfillMsg(null);
      } else {
        setBackfillMsg(data.error || 'Backfill failed');
      }
    } catch (e) {
      setBackfillMsg(e instanceof Error ? e.message : 'Backfill failed');
    } finally {
      setBackfilling(false);
    }
  }

  // ── Banner logic ───────────────────────────────────────────────────────────
  const hasWeatherForDate = weather.length > 0;
  const isToday = date === maxDate;
  const missingWeather = !loading && !hasWeatherForDate && !isToday;

  return (
    <div
      className="min-h-screen bg-gray-50 text-gray-900 dark:bg-slate-900 dark:text-slate-100"
      {...swipeHandlers}
    >
      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-gray-50/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900 dark:text-white truncate">
              Temperature Blanket Tracker
            </h1>
            <div className="flex items-center gap-1 shrink-0">
              <label className="label hidden sm:block mr-1" htmlFor="date-picker">
                Date
              </label>
              <button
                onClick={() => shiftDate(-1)}
                disabled={!canGoPrev}
                aria-label="Previous day"
                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-default transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <input
                id="date-picker"
                type="date"
                className="input bg-white text-gray-900 dark:bg-slate-800 dark:text-slate-100 dark:[color-scheme:dark]"
                value={date}
                min={minDate}
                max={maxDate}
                onChange={(e) => changeDate(e.target.value)}
              />
              <button
                onClick={() => shiftDate(1)}
                disabled={!canGoNext}
                aria-label="Next day"
                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-default transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          {/* ── Quick jump buttons ─────────────────────────────────────── */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => changeDate(yesterdayET())}
              className="text-xs px-2 py-1 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Yesterday
            </button>
            <button
              onClick={() => changeDate(todayET())}
              className="text-xs px-2 py-1 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      <div
        className={`max-w-5xl mx-auto p-4 space-y-6 transition-opacity duration-150 ${
          transitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {err && (
          <div role="alert" className="text-red-600 dark:text-red-400">
            {err}
          </div>
        )}

        {/* ── Today banner ────────────────────────────────────────────── */}
        {!loading && isToday && !hasWeatherForDate && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-sm">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              Today&#39;s weather will be available after the day ends. Check back tomorrow.
            </span>
          </div>
        )}

        {/* ── Missing weather badge with backfill button ──────────────── */}
        {missingWeather && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                {backfillMsg || `Weather data missing for ${date}.`}
              </span>
            </div>
            <button
              onClick={backfillDate}
              disabled={backfilling}
              className="shrink-0 px-3 py-1 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {backfilling ? 'Fetching...' : 'Fetch Now'}
            </button>
          </div>
        )}

        {/* ── Location cards (or skeletons) ───────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            locations.map((loc) => {
              const w = weatherByLoc[`${loc.name},${loc.state}`];
              const weatherForCard =
                w != null && Number.isFinite(w.highTempF)
                  ? {
                      highTempF: w.highTempF as number,
                      rained: w.rained,
                      snowed: w.snowed,
                    }
                  : undefined;
              const trendKey = `${loc.name},${loc.state}`;

              return (
                <LocationCard
                  key={loc.id}
                  name={loc.name}
                  state={loc.state}
                  weather={weatherForCard}
                  people={peopleByLoc[loc.name] ?? []}
                  checks={groupedChecks[loc.name] ?? {}}
                  onToggle={toggle}
                  trendTemps={trendsByLoc[trendKey]}
                />
              );
            })
          )}
        </div>

        {!loading && locations.length === 0 && !err && (
          <div className="text-gray-500 dark:text-gray-400 text-center py-8">
            No data for {date}.
          </div>
        )}

        {/* ── Calendar + Progress section ─────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CalendarHeatmap
              data={stats.calendar}
              selectedDate={date}
              onSelectDate={changeDate}
              minDate={minDate}
              maxDate={maxDate}
            />
            <ProgressTracker progress={stats.progress} />
          </div>
        )}

        {/* ── Incomplete dates per person ─────────────────────────────── */}
        {stats && (
          <IncompleteDates progress={stats.progress} onSelectDate={changeDate} />
        )}
      </div>
    </div>
  );
}
