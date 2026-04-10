import { NextRequest, NextResponse } from 'next/server';
import { resetStaleStreaks } from '@/lib/streak';

export const dynamic = 'force-dynamic';

// Called daily by the Vercel cron job.
// Resets streak to -1 for anyone who hasn't performed an action in 2+ days.
//
// AUTH: same pattern as fetch-yesterday — accepts Bearer token or same-origin.

function checkCronAuth(req: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV === 'development') return null;

  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader) return null;

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

  try {
    const resetCount = await resetStaleStreaks();
    return NextResponse.json({ ok: true, resetCount });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
