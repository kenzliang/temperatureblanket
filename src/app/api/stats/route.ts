import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import type { DaySummary, PersonProgress, StatsResponse } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/stats?year=YYYY
// Returns two datasets:
//   calendar: per-day summary (has weather?, completion count)
//   progress: per-person YTD completed count

export async function GET(req: NextRequest): Promise<NextResponse> {
  const yearParam = req.nextUrl.searchParams.get('year');
  const year = yearParam && /^\d{4}$/.test(yearParam) ? yearParam : String(new Date().getFullYear());
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  try {
    // Fetch all people with locations
    const { data: people, error: pErr } = await supabase
      .from('people')
      .select('id, name, location_id, locations ( id, name, state )')
      .order('name');
    if (pErr) throw pErr;

    // Fetch all person_checks for the year
    const { data: allChecks, error: cErr } = await supabase
      .from('person_checks')
      .select('d, person_id, completed')
      .gte('d', startDate)
      .lte('d', endDate);
    if (cErr) throw cErr;

    // Fetch all weather for the year (need date + temp for heatmap)
    const { data: weatherRows, error: wErr } = await supabase
      .from('daily_weather')
      .select('d, high_temp_f')
      .gte('d', startDate)
      .lte('d', endDate);
    if (wErr) throw wErr;

    const totalPeople = (people ?? []).length;

    // Build per-date weather aggregates: which dates have data + avg temp
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

    // Build calendar: per-date completion summary
    const dayMap = new Map<string, { completed: number; total: number }>();
    for (const c of allChecks ?? []) {
      const entry = dayMap.get(c.d) ?? { completed: 0, total: 0 };
      entry.total++;
      if (c.completed) entry.completed++;
      dayMap.set(c.d, entry);
    }

    // Merge all dates that have either weather or checks
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

    // Build per-person progress: count completed days YTD
    const personCompletedMap = new Map<string, number>();
    const personTotalMap = new Map<string, number>();
    for (const c of allChecks ?? []) {
      personTotalMap.set(c.person_id, (personTotalMap.get(c.person_id) ?? 0) + 1);
      if (c.completed) {
        personCompletedMap.set(c.person_id, (personCompletedMap.get(c.person_id) ?? 0) + 1);
      }
    }

    const progress: PersonProgress[] = (people ?? []).map((p: any) => ({
      personId: p.id,
      personName: p.name,
      locationName: p.locations?.name ?? '',
      completedDays: personCompletedMap.get(p.id) ?? 0,
      totalDays: personTotalMap.get(p.id) ?? 0,
    }));

    const body: StatsResponse = { calendar, progress };
    return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'stats GET failed' },
      { status: 500 }
    );
  }
}
