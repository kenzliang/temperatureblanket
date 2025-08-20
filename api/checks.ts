import { VercelRequest, VercelResponse } from '@vercel/node';
import { supaService } from './_supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const d = (req.query.date as string) || new Date().toISOString().slice(0, 10);

    try {
      // 1) Get the fixed roster (always returns all people)
      const { data: people, error: peopleErr } = await supaService
        .from('people')
        .select('id,name,location_id,locations:location_id(name)')
        .order('name', { ascending: true });

      if (peopleErr) throw peopleErr;

      // 2) Get checks for that date
      const { data: checks, error: checksErr } = await supaService
        .from('person_checks')
        .select('person_id,completed')
        .eq('d', d);

      if (checksErr) throw checksErr;

      // 3) Merge: default completed=false for everyone
      const completedByPerson = new Map<string, boolean>();
      for (const c of checks || []) completedByPerson.set(c.person_id, !!c.completed);

      const merged = (people || []).map((p: any) => ({
        personId: p.id,
        name: p.name,
        location: p.locations?.name, // "Windham" | "Concord" | "Somerville" | "Quincy"
        completed: completedByPerson.get(p.id) ?? false
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
