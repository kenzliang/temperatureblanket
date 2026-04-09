import { NextRequest, NextResponse } from 'next/server';
import { yesterdayET } from '@/lib/dates';
import { fetchAndStoreWeather, getLocationsFromDb } from '@/lib/weather';

// Allow up to 60 seconds — set to the max your Vercel plan supports.
// Without this, Vercel enforces 10s (hobby) or 25s (pro) default timeouts.
export const maxDuration = 60;

// This endpoint is called daily by the Vercel cron job defined in vercel.json.
// It can also be called manually with ?date=YYYY-MM-DD to backfill a single day.
//
// AUTH: Vercel cron requests include Authorization: Bearer <CRON_SECRET>.
// Manual production calls must supply the same header.
// In development (NODE_ENV=development), auth is skipped for convenience.

function checkCronAuth(req: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV === 'development') return null;
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null; // auth passed
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authErr = checkCronAuth(req);
  if (authErr) return authErr;

  const dateParam = req.nextUrl.searchParams.get('date');
  if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
  }
  const d = dateParam ?? yesterdayET();

  try {
    // Fetch locations from DB — adding a new location only needs a DB insert
    const locations = await getLocationsFromDb();
    const errors: { location: string; error: string }[] = [];

    for (const loc of locations) {
      try {
        await fetchAndStoreWeather(loc.id, loc.lat, loc.lon, d);
      } catch (e: unknown) {
        errors.push({
          location: loc.name,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    if (errors.length > 0) {
      // 207 Multi-Status: some locations succeeded, some failed
      return NextResponse.json({ ok: false, date: d, errors }, { status: 207 });
    }

    return NextResponse.json({ ok: true, date: d, locations: locations.length });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
