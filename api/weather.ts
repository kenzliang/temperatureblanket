import { VercelRequest, VercelResponse } from '@vercel/node';
import { supaService } from './_supabase.js';

// Returns weather rows for a given date (YYYY-MM-DD).
// Uses the Supabase *service role* so RLS doesn't block server-side reads.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const d = (req.query.date as string) || new Date().toISOString().slice(0, 10);

  try {
    const { data, error } = await supaService.rpc('get_weather_for_date', { d_in: d });
    if (error) throw error;

    // Normalize field name casing: ensure "highTempF" always exists
    const normalized = (data ?? []).map((row: any) => ({
      ...row,
      highTempF:
        row?.highTempF ??
        row?.hightempf ??           // lowercase variant seen in your payload
        row?.hightemp_f ??          // extra safety
        null,
    }));

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(normalized);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'weather endpoint error' });
  }
}
