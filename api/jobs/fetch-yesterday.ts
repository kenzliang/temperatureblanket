import { VercelRequest, VercelResponse } from '@vercel/node';
import { supaService } from '../_supabase.js';

const PRECIP_THRESHOLD_IN = parseFloat(process.env.PRECIP_THRESHOLD_IN || '0.05');

const LOCS = [
  { name: 'Windham', state: 'NH', lat: 42.809, lon: -71.304 },
  { name: 'Concord', state: 'MA', lat: 42.460, lon: -71.350 },
  { name: 'Somerville', state: 'MA', lat: 42.388, lon: -71.099 },
  { name: 'Quincy', state: 'MA', lat: 42.253, lon: -71.002 }
];

// Compute yesterday in America/New_York reliably
function yesterdayInET(): string {
  const now = new Date();
  const etNow = new Date(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(now)
  );
  etNow.setDate(etNow.getDate() - 1);
  const yyyy = etNow.getFullYear();
  const mm = String(etNow.getMonth() + 1).padStart(2, '0');
  const dd = String(etNow.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const d = (req.query.date as string) || yesterdayInET();

  try {
    for (const loc of LOCS) {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', String(loc.lat));
      url.searchParams.set('longitude', String(loc.lon));
      url.searchParams.set('daily', 'temperature_2m_max,precipitation_sum,snowfall_sum');
      url.searchParams.set('timezone', 'America/New_York');
      url.searchParams.set('start_date', d);
      url.searchParams.set('end_date', d);

      const r = await fetch(url.toString());
      if (!r.ok) throw new Error(`Open-Meteo error ${r.status}`);
      const raw = await r.json();

      const idx = 0; // single-day range
      const tmaxC = raw.daily?.temperature_2m_max?.[idx];
      const precipMM = raw.daily?.precipitation_sum?.[idx] ?? 0;
      const snowfallCM = raw.daily?.snowfall_sum?.[idx] ?? 0;

      const highF = (tmaxC * 9) / 5 + 32;
      const precipIN = precipMM / 25.4;
      const snowed = snowfallCM > 0;
      const rained = precipIN > PRECIP_THRESHOLD_IN && !snowed;

      // Upsert location (idempotent by name+state)
      const { data: locRow } = await supaService
        .from('locations')
        .upsert(
          { name: loc.name, state: loc.state, lat: loc.lat, lon: loc.lon },
          { onConflict: 'name' }
        )
        .select()
        .single();

      // Upsert weather
      await supaService.from('daily_weather').upsert(
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

      // Ensure person_checks exist for all people in this location for date d
      const { data: people } = await supaService
        .from('people')
        .select('id')
        .eq('location_id', locRow.id);

      if (people && people.length) {
        const rows = people.map(p => ({ d, person_id: p.id, completed: false }));
        await supaService.from('person_checks').upsert(rows, { onConflict: 'd,person_id' });
      }
    }

    return res.status(200).json({ ok: true, date: d });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
