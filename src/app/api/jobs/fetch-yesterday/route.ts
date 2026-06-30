import { NextRequest, NextResponse } from 'next/server';
import { yesterdayET } from '@/lib/dates';
import { fetchAndStoreWeather, getLocationsFromDb } from '@/lib/weather';

// Allow up to 60 seconds — set to the max your Vercel plan supports.
// Without this, Vercel enforces 10s (hobby) or 25s (pro) default timeouts.
export const maxDuration = 60;

// This endpoint is called daily by the Vercel cron job defined in vercel.json.
// It can also be called manually with ?date=YYYY-MM-DD to backfill a single day.
//
// AUTH: accepts either:
//   1. Bearer <CRON_SECRET> — Vercel cron / manual curl
//   2. No auth header — same-origin fetch (Fetch Now button); middleware validated origin
// In development, auth is skipped entirely.

function checkCronAuth(req: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV === 'development') return null;

  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader) return null; // same-origin fetch — middleware already verified

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

    // Process locations CONCURRENTLY, not sequentially. Each location does
    // network fetches (with retries/backoff) plus DB writes; run serially the
    // total time is the SUM across locations, which can blow past the Vercel
    // function timeout and leave later locations unwritten (this is what caused
    // the 2026-06-10 gap — the last two alphabetical locations were never
    // reached). allSettled also keeps one location's failure from affecting the
    // others, so a single bad response still writes the rest.
    const results = await Promise.allSettled(
      locations.map((loc) => fetchAndStoreWeather(loc.id, loc.lat, loc.lon, d))
    );

    const errors: { location: string; error: string }[] = [];
    results.forEach((res, i) => {
      if (res.status === 'rejected') {
        const reason = res.reason;
        errors.push({
          location: locations[i].name,
          error: reason instanceof Error ? reason.message : String(reason),
        });
      }
    });

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
