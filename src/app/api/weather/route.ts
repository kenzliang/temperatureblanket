import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import type { WeatherApiRow } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/weather?date=YYYY-MM-DD
// Returns weather rows for all locations on the given date.
// Uses direct table query + relational select instead of the old RPC function.

export async function GET(req: NextRequest): Promise<NextResponse> {
  const date = req.nextUrl.searchParams.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date required (YYYY-MM-DD)' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('daily_weather')
      .select(
        'id, d, location_id, high_temp_f, precip_in, snowfall_cm, rained, snowed, locations ( id, name, state, lat, lon )'
      )
      .eq('d', date);
    if (error) throw error;

    // Transform DB snake_case to camelCase shape the frontend expects
    // Postgres `pg` driver returns DOUBLE PRECISION as strings;
    // Supabase returns them as numbers. Coerce to ensure consistency.
    const rows: WeatherApiRow[] = (data ?? []).map((row: any) => ({
      id: row.id,
      date: row.d,
      locationId: row.location_id,
      location: row.locations,
      highTempF: row.high_temp_f != null ? Number(row.high_temp_f) : null,
      precipIn: Number(row.precip_in ?? 0),
      snowfallCm: Number(row.snowfall_cm ?? 0),
      rained: row.rained,
      snowed: row.snowed,
    }));

    return NextResponse.json(rows, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'weather GET failed' },
      { status: 500 }
    );
  }
}
