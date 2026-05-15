import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { updateStreak } from '@/lib/streak';
import type { CheckApiRow } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/checks?date=YYYY-MM-DD
// Returns ALL people regardless of whether they have a check row for this date.
// completed defaults to false for people with no row yet.
// location is returned as a full object (id, name, state, lat, lon) so that
// the frontend can derive the location list from the checks response.

export async function GET(req: NextRequest): Promise<NextResponse> {
  const date = req.nextUrl.searchParams.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date required (YYYY-MM-DD)' }, { status: 400 });
  }

  try {
    const { data: people, error: pErr } = await supabase
      .from('people')
      .select('id, name, location_id, locations ( id, name, state, lat, lon )')
      .order('name');
    if (pErr) throw pErr;

    const { data: checksData, error: cErr } = await supabase
      .from('person_checks')
      .select('person_id, completed')
      .eq('d', date);
    if (cErr) throw cErr;

    const completedMap = new Map<string, boolean>();
    for (const c of checksData ?? []) completedMap.set(c.person_id, !!c.completed);

    const rows: CheckApiRow[] = (people ?? []).map((p: any) => ({
      person: { id: p.id, name: p.name, location: p.locations },
      completed: completedMap.get(p.id) ?? false,
    }));

    return NextResponse.json(rows, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'checks GET failed' },
      { status: 500 }
    );
  }
}

// POST /api/checks
// Body: { date: string, personId: string, completed: boolean }
// Upserts a single check row. Sets completed_at timestamp when completing.

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const { date, personId, completed } = body as Record<string, unknown>;
  if (
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    typeof personId !== 'string' ||
    typeof completed !== 'boolean'
  ) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  try {
    const { error } = await supabase.from('person_checks').upsert(
      {
        d: date,
        person_id: personId,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      },
      { onConflict: 'd,person_id' }
    );
    if (error) throw error;

    // Only update streak when checking off (not unchecking)
    let streak: number | undefined;
    if (completed) {
      streak = await updateStreak(personId as string, date as string);
    }

    return NextResponse.json({ ok: true, ...(streak != null && { streak }) });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'checks POST failed' },
      { status: 500 }
    );
  }
}
