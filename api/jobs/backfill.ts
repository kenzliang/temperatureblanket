import { VercelRequest, VercelResponse } from '@vercel/node';
import { supaService } from '../_supabase.js';

// Reuse the same Open-Meteo logic as fetch-yesterday (duplicated here for clarity)
const PRECIP_THRESHOLD_IN = parseFloat(process.env.PRECIP_THRESHOLD_IN || '0.05');

const LOCS = [
  { name: 'Windham', state: 'NH', lat: 42.809, lon: -71.304 },
  { name: 'Concord', state: 'MA', lat: 42.460, lon: -71.350 },
  { name: 'Somerville', state: 'MA', lat: 42.388, lon: -71.099 },
  { name: 'Quincy', state: 'MA', lat: 42.253, lon: -71.002 }
];

async function fetchDailyOpenMeteo(lat: number, lon: number, d: string) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: 'temperature_2m_max,precipitation_sum,snowfall_sum',
    timezone: 'America/New_York',
    start_date: d,
    end_date: d
  });

  // Try forecast, then archive fallback
  let r = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (r.status === 400) {
    r = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params.toString()}`);
  }
  if (!r.ok) {
    const msg = await r.text().catch(() => '');
    throw new Error(`Open-Meteo ${r.status}: ${msg || 'request failed'}`);
  }
  return r.json();
}

function toDateString(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default async function backfill(req: VercelRequest, res: VercelResponse) {
  const start = String(req.query.start || '').slice(0, 10);
  const end = String(req.query.end || '').slice(0, 10);
  if (!start || !end) {
    return res.status(400).json({ error: 'start & end required (YYYY-MM-DD)' });
  }

  const dates: string[] = [];
  for (
    let d = new Date(start);
    d <= new Date(end);
    d.setDate(d.getDate() + 1)
  ) {
    dates.push(toDateString(new Date(d)));
  }

  const results: { date: string; ok: boolean; error?: string }[] = [];

  try {
    for (const d of dates) {
      for (const loc of LOCS) {
        try {
          const raw = await fetchDailyOpenMeteo(loc.lat, loc.lon, d);

          const idx = 0;
          const tmaxC = raw.daily?.temperature_2m_max?.[idx];
          const precipMM = raw.daily?.precipitation_sum?.[idx] ?? 0;
          const snowfallCM = raw.daily?.snowfall_sum?.[idx] ?? 0;

          if (typeof tmaxC !== 'number') throw new Error(`Missing temp for ${loc.name} ${d}`);

          const highF = (tmaxC * 9) / 5 + 32;
          const precipIN = precipMM / 25.4;
          const snowed = snowfallCM > 0;
          const rained = precipIN > PRECIP_THRESHOLD_IN && !snowed;

          const { data: locRow, error: locErr } = await supaService
            .from('locations')
            .upsert(
              { name: loc.name, state: loc.state, lat: loc.lat, lon: loc.lon },
              { onConflict: 'name' }
            )
            .select()
            .single();
          if (locErr) throw locErr;

          const { error: wErr } = await supaService.from('daily_weather').upsert(
            {
              d,
              location_id: locRow.id,
              high_temp_f: highF,
              precip_in: precipIN,
              snowfall_cm: snowfallCM,
              rained,
              snowed,
              raw
            },
            { onConflict: 'd,location_id' }
          );
          if (wErr) throw wErr;

          const { data: people, error: pErr } = await supaService
            .from('people')
            .select('id')
            .eq('location_id', locRow.id);
          if (pErr) throw pErr;

          if (people?.length) {
            const rows = people.map(p => ({ d, person_id: p.id, completed: false }));
            const { error: cErr } = await supaService
              .from('person_checks')
              .upsert(rows, { onConflict: 'd,person_id' });
            if (cErr) throw cErr;
          }

          results.push({ date: d, ok: true });
        } catch (e: any) {
          results.push({ date: d, ok: false, error: e.message || String(e) });
        }
      }
    }
  } catch (e: any) {
    return res.status(500).json({ error: e.message || String(e), results });
  }

  const failures = results.filter(r => !r.ok);
  return res.status(200).json({
    ok: failures.length === 0,
    totalDays: dates.length,
    totalOps: results.length,
    failures
  });
}
