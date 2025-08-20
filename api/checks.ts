import { VercelRequest, VercelResponse } from '@vercel/node';
import { supaService } from './_supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const d = (req.query.date as string) || new Date().toISOString().slice(0, 10);

    try {
      // Direct join: always returns one row per person, even if no person_checks row yet
      const { data, error } = await supaService
        .from('people')
        .select(`
          id,
          name,
          locations:location_id ( name ),
          person_checks!left ( completed )
        `)
        .eq('person_checks.d', d)
        .order('name', { ascending: true });

      if (error) throw error;

      // If person_checks row not present for a person on date d, Supabase won't include it in the above left join filter.
      // So we need a second query without the filter and stitch results to ensure every person appears.
      const { data: everyone, error: allErr } = await supaService
        .from('people')
        .select(`
          id,
          name,
          locations:location_id ( name )
        `)
        .order('name', { ascending: true });

      if (allErr) throw allErr;

      // Build map from first query (people who have a row that day)
      const hasRow = new Map<string, boolean>();
      const completedMap = new Map<string, boolean>();
      for (const row of data || []) {
        hasRow.set(row.id, true);
        completedMap.set(row.id, !!row.person_checks?.[0]?.completed);
      }

      // Merge: ensure we return an entry for every person, defaulting completed=false
      const merged = (everyone || []).map((p: any) => ({
        personId: p.id,
        name: p.name,
        location: p.locations?.name,
        completed: completedMap.get(p.id) ?? false
      }));

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(merged);
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'checks GET failed' });
    }
  }

  if (req.method === 'POST') {
    const { date, personId, completed } = req.body || {};
    if (!date || !personId || typeof completed !== 'boolean') {
      return res.status(400).json({ error: 'invalid body' });
    }

    try {
      const { error } = await supaService
        .from('person_checks')
        .upsert(
          {
            d: date,
            person_id: personId,
            completed,
            completed_at: completed ? new Date().toISOString() : null
          },
          { onConflict: 'd,person_id' }
        );

      if (error) throw error;
      return res.status(200).json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'checks POST failed' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end('Method Not Allowed');
}
