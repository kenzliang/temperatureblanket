import { VercelRequest, VercelResponse } from '@vercel/node';
import { supaAnon, supaService } from './_supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const d = (req.query.date as string) || new Date().toISOString().slice(0,10);
    try {
      const { data, error } = await supaAnon.rpc('get_checks_for_date', { d_in: d });
      if (error) throw error;
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }
  if (req.method === 'POST') {
    const { date, personId, completed } = req.body || {};
    if (!date || !personId || typeof completed !== 'boolean') {
      return res.status(400).json({ error: 'invalid body' });
    }
    try {
      const { data, error } = await supaService
        .from('person_checks')
        .upsert({ d: date, person_id: personId, completed, completed_at: completed ? new Date().toISOString() : null }, { onConflict: 'd,person_id' })
        .select();
      if (error) throw error;
      return res.status(200).json({ ok: true, data });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end('Method Not Allowed');
}