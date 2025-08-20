import { VercelRequest, VercelResponse } from '@vercel/node';
import { supaService } from '../_supabase.js';

const PRECIP_THRESHOLD_IN = parseFloat(process.env.PRECIP_THRESHOLD_IN || '0.05');

const LOCS = [
  { name: 'Windham', state: 'NH', lat: 42.809, lon: -71.304 },
  { name: 'Concord', state: 'MA', lat: 42.460, lon: -71.350 },
  { name: 'Somerville', state: 'MA', lat: 42.388, lon: -71.099 },
  { name: 'Quincy', state: 'MA', lat: 42.253, lon: -71.002 }
];

// Compute YYYY-MM-DD for 'yesterday' in America/New_York
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

// Choose the correct Open-Meteo endpoint for a given date.
// Strategy: try forecast first; on 400 fallback to archive.
async function fetchDailyOpenMeteo(lat: number, lon: number, d: string) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: 'temperature_2m_max,precipitation_sum,snowfall_sum',
    timezone: 'America/New_York',
    start_date: d,
    end_date: d
  });

  // 1) Forecast
  let r = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (r.status === 400) {
    // 2) Archive fallback (for historical dates)
    r = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params.toString()}`);
  }
  if (!r.ok) {
    const msg = await r.text().catch(() => '');
    throw new Error(`Open-Meteo ${r.status}: ${msg || 'request failed'}`);
  }
  return r.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const d = (req.query.date as string) || yesterdayInET();

  try {
    for (const loc of LOCS) {
      const raw = await fetchDailyOpenMeteo(loc.lat, loc.lon, d);

      const idx = 0; // single-day range
      const tmaxC = raw.daily?.temperature_2m_max?.[idx];
      const precipMM = raw.daily?.precipitation_sum?.[idx] ?? 0;
      const snowfallCM = raw.daily?.snowfall_sum?.[idx] ?? 0;

      // Tolerate missing temps (rare); skip insert if undefined
      if (typeof tmaxC !== 'number') {
        throw new Error(`Missing temperature for ${loc.name} on ${d}`);
      }

      const highF = (tmaxC * 9) / 5 + 32;
      const precipIN = precipMM / 25.4;
      const snowed = snowfallCM > 0;
      const rained = precipIN > PRECIP_THRESHOLD_IN && !snowed;

      // Upsert location (idempotent by name)
      const { data: locRow, error: locErr } = await supaService
        .from('locations')
        .upsert(
          { name: loc.name, state: loc.state, lat: loc.lat, lon: loc.lon },
          { onConflict: 'name' }
        )
        .select()
        .single();
      if (locErr) throw locErr;

      // Upsert weather row
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

      // Ensure person_checks exist for this date/location
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
    }

    return res.status(200).json({ ok: true, date: d });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
