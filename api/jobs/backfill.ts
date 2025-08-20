import { VercelRequest, VercelResponse } from '@vercel/node';
import handler from './fetch-yesterday.js';

// Reuse fetch-yesterday logic by calling with ?date=YYYY-MM-DD for each day.
export default async function backfill(req: VercelRequest, res: VercelResponse) {
  const start = String(req.query.start || '').slice(0,10);
  const end = String(req.query.end || '').slice(0,10);
  if (!start || !end) return res.status(400).json({ error: 'start & end required (YYYY-MM-DD)' });

  const dates: string[] = [];
  for (let d = new Date(start); d <= new Date(end); d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d).toISOString().slice(0,10));
  }
  for (const d of dates) {
    const fakeReq: any = { query: { date: d } };
    const fakeRes: any = { status: (c: number) => ({ json: (_: any) => c }) };
    await (handler as any)(fakeReq, fakeRes);
  }
  return res.status(200).json({ ok: true, count: dates.length });
}