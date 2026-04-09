import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import type { DaySummary, PersonProgress, LocationTrend, StatsResponse } from '@/types';
import { yesterdayET } from '@/lib/dates';

export const dynamic = 'force-dynamic';

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
      .select('id, name, location_id, locations ( id, name, state )')
      .order('name');
    if (pErr) throw pErr;

    const { data: allChecks, error: cErr } = await supabase
      .from('person_checks')
      .select('d, person_id, completed')
      .gte('d', startDate)
      .lte('d', endDate);
    if (cErr) throw cErr;

    const { data: weatherRows, error: wErr } = await supabase
      .from('daily_weather')
      .select('d, high_temp_f, location_id, locations ( name, state )')
      .gte('d', startDate)
      .lte('d', endDate);
    if (wErr) throw wErr;

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

    // ── Per-person progress + streak ───────────────────────────────────────
    // Streak: the last 5 days (from yesterday back) must ALL be completed.
    // If yes, count consecutive completed days backwards from yesterday.
    // If any of the last 5 are incomplete, streak = 0.
    const yesterday = yesterdayET();

    // Build per-person: date → completed, plus counts and incomplete list
    const personCheckMap = new Map<string, Map<string, boolean>>();
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
      if (!personCheckMap.has(c.person_id)) personCheckMap.set(c.person_id, new Map());
      personCheckMap.get(c.person_id)!.set(c.d, !!c.completed);
    }

    function dateNDaysAgo(from: string, n: number): string {
      const d = new Date(from + 'T00:00:00');
      d.setDate(d.getDate() - n);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function computeStreak(personId: string): number {
      const checks = personCheckMap.get(personId);
      if (!checks) return 0;

      // First check: all 7 days from yesterday must be completed
      for (let i = 0; i < 7; i++) {
        const ds = dateNDaysAgo(yesterday, i);
        if (ds < startDate) break;
        if (checks.get(ds) !== true) return 0;
      }

      // All 5 recent days are complete — now count the full streak
      let streak = 0;
      const d = new Date(yesterday + 'T00:00:00');
      for (let i = 0; i < 400; i++) {
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (ds < startDate) break;
        if (checks.get(ds) !== true) break;
        streak++;
        d.setDate(d.getDate() - 1);
      }

      return streak;
    }

    const progress: PersonProgress[] = (people ?? []).map((p: any) => {
      const incomplete = personIncompleteDates.get(p.id) ?? [];
      incomplete.sort(); // oldest first
      return {
        personId: p.id,
        personName: p.name,
        locationName: p.locations?.name ?? '',
        completedDays: personCompletedMap.get(p.id) ?? 0,
        totalDays: personTotalMap.get(p.id) ?? 0,
        streak: computeStreak(p.id),
        incompleteDates: incomplete,
      };
    });

    // ── 7-day location trends ──────────────────────────────────────────────
    // Build last 7 days of date strings ending at yesterday
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
