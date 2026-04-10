import { NextRequest, NextResponse } from 'next/server';
import { fetchAndStoreWeather, getLocationsFromDb } from '@/lib/weather';

// 5 minutes — maximum on Vercel Pro.
// For large ranges (e.g. full year = 365 × 4 locations), split into monthly chunks
// to stay well within the timeout.
export const maxDuration = 300;

function checkCronAuth(req: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV === 'development') return null;

  const authHeader = req.headers.get('authorization') ?? '';
  const [scheme] = authHeader.split(' ');

  // Basic Auth — middleware already validated credentials
  if (scheme === 'Basic') return null;

  // Bearer token — validate against CRON_SECRET
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// GET /api/jobs/backfill?start=YYYY-MM-DD&end=YYYY-MM-DD
// Backfills weather and person_checks for every date in the range (inclusive).
// Each location+date combination is attempted independently; failures are
// collected and returned without aborting the rest of the run.

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authErr = checkCronAuth(req);
  if (authErr) return authErr;

  const start = req.nextUrl.searchParams.get('start')?.slice(0, 10) ?? '';
  const end = req.nextUrl.searchParams.get('end')?.slice(0, 10) ?? '';

  if (
    !start ||
    !end ||
    !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(end)
  ) {
    return NextResponse.json(
      { error: 'start and end query params required (YYYY-MM-DD)' },
      { status: 400 }
    );
  }

  // Build date list using UTC midnight timestamps to avoid DST boundary issues.
  // We only need calendar date strings, so UTC arithmetic is correct here.
  const dates: string[] = [];
  for (
    let ms = new Date(start + 'T00:00:00Z').getTime();
    ms <= new Date(end + 'T00:00:00Z').getTime();
    ms += 86400000
  ) {
    const d = new Date(ms);
    dates.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
        d.getUTCDate()
      ).padStart(2, '0')}`
    );
  }

  try {
    const locations = await getLocationsFromDb();
    const results: {
      date: string;
      location: string;
      ok: boolean;
      error?: string;
    }[] = [];

    for (const d of dates) {
      for (const loc of locations) {
        try {
          await fetchAndStoreWeather(loc.id, loc.lat, loc.lon, d);
          results.push({ date: d, location: loc.name, ok: true });
        } catch (e: unknown) {
          results.push({
            date: d,
            location: loc.name,
            ok: false,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }

    const failures = results.filter((r) => !r.ok);
    return NextResponse.json({
      ok: failures.length === 0,
      totalDays: dates.length,
      totalOps: results.length,
      failures,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
