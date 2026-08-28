import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import type { DaySummary, PersonProgress, LocationTrend, StatsResponse } from '@/types';
import { yesterdayET } from '@/lib/dates'; // still used for trend dates

export const dynamic = 'force-dynamic';

// Supabase/PostgREST caps each request at a server-configured max row count
// (1000 by default). A year of person_checks or daily_weather easily exceeds
// that (7 people * ~240 days ~= 1700 rows), so an un-paginated .select() here
// silently truncates — which showed up as everyone's YTD total being stuck at
// exactly 1000 rows / numPeople. Page through with .range() until a page comes
// back short. Requires a stable .order() so pages don't overlap or skip rows.
const PAGE_SIZE = 1000;

async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return all;
}

// GET /api/stats?year=YYYY
// Returns:
//   calendar:  per-day summary (has weather?, avg temp, completion count)
//   progress:  per-person YTD completed count + streak
//   trends:    7-day temp history per location

export async function GET(req: NextRequest): Promise<NextResponse> {
  const yearParam = req.nextUrl.searchParams.get('year');
  const year = yearParam && /^\d{4}$/.test(yearParam) ? yearParam : String(new Date().getFullYear());
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  try {
    const { data: people, error: pErr } = await supabase
      .from('people')
      .select('id, name, location_id, streak, locations ( id, name, state )')
      .eq('active', true)
      .order('name');
    if (pErr) throw pErr;

    const allChecks = await fetchAllRows<{ d: string; person_id: string; completed: boolean }>(
      (from, to) =>
        supabase
          .from('person_checks')
          .select('d, person_id, completed')
          .gte('d', startDate)
          .lte('d', endDate)
          .order('d')
          .range(from, to)
    );

    const weatherRows = await fetchAllRows<{
      d: string;
      high_temp_f: number | null;
      location_id: string;
      locations: { name: string; state: string } | null;
    }>((from, to) =>
      supabase
        .from('daily_weather')
        .select('d, high_temp_f, location_id, locations ( name, state )')
        .gte('d', startDate)
        .lte('d', endDate)
        .order('d')
        .range(from, to)
    );

    const totalPeople = (people ?? []).length;

    // ── Calendar data ──────────────────────────────────────────────────────
    const weatherDateSet = new Set<string>();
    const tempByDate = new Map<string, number[]>();
    for (const w of weatherRows ?? []) {
      weatherDateSet.add(w.d);
      if (w.high_temp_f != null) {
        const temps = tempByDate.get(w.d) ?? [];
        temps.push(Number(w.high_temp_f));
        tempByDate.set(w.d, temps);
      }
    }

    const dayMap = new Map<string, { completed: number; total: number }>();
    for (const c of allChecks ?? []) {
      const entry = dayMap.get(c.d) ?? { completed: 0, total: 0 };
      entry.total++;
      if (c.completed) entry.completed++;
      dayMap.set(c.d, entry);
    }

    const allDates = new Set<string>();
    for (const d of weatherDateSet) allDates.add(d);
    for (const d of dayMap.keys()) allDates.add(d);

    const calendar: DaySummary[] = Array.from(allDates)
      .sort()
      .map((date) => {
        const temps = tempByDate.get(date);
        const avgTempF = temps && temps.length > 0
          ? temps.reduce((a, b) => a + b, 0) / temps.length
          : null;
        return {
          date,
          totalPeople,
          completedCount: dayMap.get(date)?.completed ?? 0,
          hasWeather: weatherDateSet.has(date),
          avgTempF: avgTempF != null ? Math.round(avgTempF * 10) / 10 : null,
        };
      });

    // ── Per-person progress (streak read from DB) ──────────────────────────
    const personCompletedMap = new Map<string, number>();
    const personTotalMap = new Map<string, number>();
    const personIncompleteDates = new Map<string, string[]>();
    for (const c of allChecks ?? []) {
      personTotalMap.set(c.person_id, (personTotalMap.get(c.person_id) ?? 0) + 1);
      if (c.completed) {
        personCompletedMap.set(c.person_id, (personCompletedMap.get(c.person_id) ?? 0) + 1);
      } else {
        const dates = personIncompleteDates.get(c.person_id) ?? [];
        dates.push(c.d);
        personIncompleteDates.set(c.person_id, dates);
      }
    }

    const progress: PersonProgress[] = (people ?? []).map((p: any) => {
      const incomplete = personIncompleteDates.get(p.id) ?? [];
      incomplete.sort();
      return {
        personId: p.id,
        personName: p.name,
        locationName: p.locations?.name ?? '',
        completedDays: personCompletedMap.get(p.id) ?? 0,
        totalDays: personTotalMap.get(p.id) ?? 0,
        streak: Number(p.streak) || 0,
        incompleteDates: incomplete,
      };
    });

    // ── 7-day location trends ──────────────────────────────────────────────
    const yesterday = yesterdayET();
    const trendDates: string[] = [];
    {
      const d = new Date(yesterday + 'T00:00:00');
      for (let i = 6; i >= 0; i--) {
        const td = new Date(d);
        td.setDate(td.getDate() - i);
        trendDates.push(
          `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, '0')}-${String(td.getDate()).padStart(2, '0')}`
        );
      }
    }

    // Group weather by location key + date
    const locTempMap = new Map<string, Map<string, number>>();
    for (const w of weatherRows ?? []) {
      const loc = (w as any).locations;
      if (!loc) continue;
      const key = `${loc.name},${loc.state}`;
      if (!locTempMap.has(key)) locTempMap.set(key, new Map());
      if (w.high_temp_f != null) {
        locTempMap.get(key)!.set(w.d, Number(w.high_temp_f));
      }
    }

    const trends: LocationTrend[] = Array.from(locTempMap.entries()).map(([key, dateTemps]) => ({
      key,
      temps: trendDates.map((d) => dateTemps.get(d) ?? null),
    }));

    const body: StatsResponse = { calendar, progress, trends };
    return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'stats GET failed' },
      { status: 500 }
    );
  }
}
