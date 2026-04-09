// Shared weather-fetch logic used by both job handlers.
// Locations are fetched from the DB (not hardcoded), so adding a new location
// only requires a DB insert — no code deploy needed.

import { supabase } from '@/lib/supabase/server';
import type { DbLocation } from '@/types';

const PRECIP_THRESHOLD_IN = parseFloat(process.env.PRECIP_THRESHOLD_IN ?? '0.05');

/**
 * Fetch one day's weather from Open-Meteo for a single lat/lon.
 *
 * Strategy (preserved from working production code):
 * 1. Try the forecast API — works for recent dates (~16 days back)
 * 2. If the forecast API returns 400 (date too old), fall back to the archive API
 *
 * PITFALL: Do NOT use only the archive API for recent dates. The archive API
 * has a 2-5 day lag for new data. The forecast API covers recent history
 * reliably. The 400-fallback handles historical backfill transparently.
 */
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 1000;

async function fetchWithRetry(url: string): Promise<Response> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const r = await fetch(url);
      // 4xx errors are not transient — don't retry (except 429)
      if (r.ok || (r.status >= 400 && r.status < 500 && r.status !== 429)) {
        return r;
      }
      lastErr = new Error(`HTTP ${r.status}`);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
    if (attempt < MAX_RETRIES) {
      await new Promise((res) => setTimeout(res, RETRY_BASE_MS * (attempt + 1)));
    }
  }
  throw lastErr ?? new Error('fetch failed after retries');
}

export async function fetchDailyOpenMeteo(
  lat: number,
  lon: number,
  d: string
): Promise<{ tmaxC: number; precipMM: number; snowfallCM: number; raw: unknown }> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: 'temperature_2m_max,precipitation_sum,snowfall_sum',
    timezone: 'America/New_York',
    start_date: d,
    end_date: d,
  });

  let r = await fetchWithRetry(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`
  );
  if (r.status === 400) {
    r = await fetchWithRetry(
      `https://archive-api.open-meteo.com/v1/archive?${params.toString()}`
    );
  }
  if (!r.ok) {
    const msg = await r.text().catch(() => '');
    throw new Error(`Open-Meteo ${r.status}: ${msg || 'request failed'}`);
  }

  const json = await r.json();
  const tmaxC = json.daily?.temperature_2m_max?.[0];
  if (typeof tmaxC !== 'number') {
    throw new Error(`Missing temperature in Open-Meteo response for ${d}`);
  }

  return {
    tmaxC,
    precipMM: json.daily?.precipitation_sum?.[0] ?? 0,
    snowfallCM: json.daily?.snowfall_sum?.[0] ?? 0,
    raw: json,
  };
}

/** Convert raw Open-Meteo metric values to app units and boolean flags. */
export function computeWeatherFields(
  tmaxC: number,
  precipMM: number,
  snowfallCM: number
) {
  const highTempF = (tmaxC * 9) / 5 + 32;
  const precipIn = precipMM / 25.4;
  const snowed = snowfallCM > 0;
  // IMPORTANT: rained is true ONLY if precip exceeds threshold AND it did NOT snow.
  // On snowy days, precipitation_sum includes melted-snow equivalent — without the
  // !snowed guard, snowy days would also show rained=true.
  const rained = precipIn > PRECIP_THRESHOLD_IN && !snowed;
  return { highTempF, precipIn, snowfallCm: snowfallCM, rained, snowed };
}

/** Fetch all locations from the DB. */
export async function getLocationsFromDb(): Promise<DbLocation[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('id,name,state,lat,lon')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch weather for one location+date, upsert into daily_weather, and
 * create person_checks rows for people who don't have one yet for this date.
 *
 * BUG FIX vs original code: ignoreDuplicates: true on person_checks upsert.
 * The original used { onConflict: 'd,person_id' } without ignoreDuplicates,
 * which OVERWRITES existing rows on conflict — resetting completed=true back
 * to false every time the cron runs. ignoreDuplicates: true = "insert if
 * not exists, skip if already there".
 */
export async function fetchAndStoreWeather(
  locationId: string,
  lat: number,
  lon: number,
  d: string
): Promise<void> {
  const { tmaxC, precipMM, snowfallCM, raw } = await fetchDailyOpenMeteo(lat, lon, d);
  const { highTempF, precipIn, snowfallCm, rained, snowed } =
    computeWeatherFields(tmaxC, precipMM, snowfallCM);

  // Upsert weather — safe to re-run, updates data if it already exists
  const { error: wErr } = await supabase.from('daily_weather').upsert(
    {
      d,
      location_id: locationId,
      high_temp_f: highTempF,
      precip_in: precipIn,
      snowfall_cm: snowfallCm,
      rained,
      snowed,
      raw,
    },
    { onConflict: 'd,location_id' }
  );
  if (wErr) throw wErr;

  // Fetch all people at this location
  const { data: people, error: pErr } = await supabase
    .from('people')
    .select('id')
    .eq('location_id', locationId);
  if (pErr) throw pErr;

  if (people?.length) {
    const rows = people.map((p: { id: string }) => ({ d, person_id: p.id, completed: false }));
    const { error: cErr } = await supabase
      .from('person_checks')
      .upsert(rows, { onConflict: 'd,person_id', ignoreDuplicates: true });
    if (cErr) throw cErr;
  }
}
