'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WeatherApiRow, CheckApiRow } from '@/types';
import { readCache, writeCache } from '@/lib/cache';

export interface UseWeatherDataResult {
  weather: WeatherApiRow[];
  checks: CheckApiRow[];
  loading: boolean;
  err: string | null;
  backfilling: boolean;
  backfillMsg: string | null;
  toggle: (personId: string, completed: boolean) => Promise<void>;
  backfillDate: () => Promise<void>;
}

export function useWeatherData(
  date: string,
  { onCheckToggled }: { onCheckToggled?: () => void } = {},
): UseWeatherDataResult {
  const [weather, setWeather] = useState<WeatherApiRow[]>([]);
  const [checks, setChecks] = useState<CheckApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);

  // Keep a ref to the latest weather so toggle's cache write always uses fresh data.
  const weatherRef = useRef(weather);
  weatherRef.current = weather;

  useEffect(() => {
    let active = true;
    setErr(null);
    setBackfillMsg(null);

    // Show cached data instantly if available; otherwise show skeleton.
    const cached = readCache(date);
    if (cached) {
      setWeather(cached.weather);
      setChecks(cached.checks);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // Always fetch fresh data in the background.
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

  const toggle = useCallback(async (personId: string, completed: boolean) => {
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
      setChecks((latest) => {
        writeCache(date, weatherRef.current, latest);
        return latest;
      });
      onCheckToggled?.();
    } catch {
      setChecks((prev) =>
        prev.map((c) => (c.person.id === personId ? { ...c, completed: !completed } : c))
      );
      alert('Failed to update check. Please try again.');
    }
  }, [date, onCheckToggled]);

  const backfillDate = useCallback(async () => {
    setBackfilling(true);
    setBackfillMsg(null);
    try {
      const r = await fetch(`/api/jobs/fetch-yesterday?date=${date}`);
      const data = await r.json();
      if (data.ok || r.ok) {
        setBackfillMsg('Weather data fetched successfully. Refreshing...');
        const [w, c] = await Promise.all([
          fetch(`/api/weather?date=${date}`).then((r) => r.json()),
          fetch(`/api/checks?date=${date}`).then((r) => r.json()),
        ]);
        setWeather(Array.isArray(w) ? w : []);
        setChecks(Array.isArray(c) ? c : []);
        onCheckToggled?.();
        setBackfillMsg(null);
      } else {
        setBackfillMsg(data.error || 'Backfill failed');
      }
    } catch (e) {
      setBackfillMsg(e instanceof Error ? e.message : 'Backfill failed');
    } finally {
      setBackfilling(false);
    }
  }, [date, onCheckToggled]);

  return { weather, checks, loading, err, backfilling, backfillMsg, toggle, backfillDate };
}
