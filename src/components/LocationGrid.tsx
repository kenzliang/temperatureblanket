'use client';

import { useMemo } from 'react';
import { LocationCard } from '@/components/LocationCard';
import { SkeletonCard } from '@/components/SkeletonCard';
import type { WeatherApiRow, CheckApiRow, LocationTrend } from '@/types';

interface LocationGridProps {
  loading: boolean;
  weather: WeatherApiRow[];
  checks: CheckApiRow[];
  trends?: LocationTrend[];
  onToggle: (personId: string, completed: boolean) => Promise<void>;
}

export function LocationGrid({ loading, weather, checks, trends, onToggle }: LocationGridProps) {
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

  const trendsByLoc = useMemo(() => {
    const m: Record<string, (number | null)[]> = {};
    if (trends) {
      for (const t of trends) m[t.key] = t.temps;
    }
    return m;
  }, [trends]);

  return (
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
              ? { highTempF: w.highTempF as number, rained: w.rained, snowed: w.snowed }
              : undefined;

          return (
            <LocationCard
              key={loc.id}
              name={loc.name}
              state={loc.state}
              weather={weatherForCard}
              people={peopleByLoc[loc.name] ?? []}
              checks={groupedChecks[loc.name] ?? {}}
              onToggle={onToggle}
              trendTemps={trendsByLoc[`${loc.name},${loc.state}`]}
            />
          );
        })
      )}
    </div>
  );
}
