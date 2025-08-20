import { VercelRequest, VercelResponse } from '@vercel/node';
import { supaService } from './_supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const d = (req.query.date as string) || new Date().toISOString().slice(0, 10);

    try {
      // 1) Locations (id -> name)
      const { data: locs, error: locErr } = await supaService
        .from('locations')
        .select('id,name');
      if (locErr) throw locErr;
      const locName = new Map<string, string>();
      for (const l of locs || []) locName.set(l.id, l.name);

      // 2) People (fixed roster)
      const { data: people, error: peopleErr } = await supaService
        .from('people')
        .select('id,name,location_id')
        .order('name', { ascending: true });
      if (peopleErr) throw peopleErr;

      // 3) Checks for date d
      const { data: checks, error: checksErr } = await supaService
        .from('person_checks')
        .select('person_id,completed')
        .eq('d', d);
      if (checksErr) throw checksErr;

      const completedBy = new Map<string, boolean>();
      for (const c of checks || []) completedBy.set(c.person_id, !!c.completed);

      // 4) Merge into shape the frontend expects:
      // [{ person: { id, name, location }, completed }, ...]
      const merged = (people || []).map(p => ({
        person: {
          id: p.id,
          name: p.name,
          location: locName.get(p.location_id) || null,
        },
        completed: completedBy.get(p.id) ?? false,
      }));

      if (req.query.debug === '1') {
        return res.status(200).json({
          debug: true,
          date: d,
          counts: {
            locations: locs?.length ?? 0,
            people: people?.length ?? 0,
            checksForDate: checks?.length ?? 0,
          },
          sample: merged.slice(0, 6),
        });
      }

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
            completed_at: completed ? new Date().toISOString() : null,
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
