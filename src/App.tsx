import { useEffect, useMemo, useState } from 'react';
import './styles.css';
import { getChecks, getWeather, setCheck } from './api';
import { LocationCard } from './components/LocationCard';

type WeatherRow = {
  location: string;   // e.g. "Windham"
  state: string;      // e.g. "NH"
  highTempF: number;
  rained: boolean;
  snowed: boolean;
};

type CheckApiRow = {
  person: {
    id: string;
    name: string;
    location: string | null; // "Windham" | "Concord" | "Somerville" | "Quincy"
  };
  completed: boolean;
};

// Compute YYYY-MM-DD for "yesterday" in America/New_York
function yesterdayInET(): string {
  const now = new Date();
  const etToday = new Date(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)
  );
  etToday.setDate(etToday.getDate() - 1);
  const yyyy = etToday.getFullYear();
  const mm = String(etToday.getMonth() + 1).padStart(2, '0');
  const dd = String(etToday.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function App() {
  // ✅ Default to yesterday in ET
  const [date, setDate] = useState<string>(yesterdayInET());
  const [weather, setWeather] = useState<WeatherRow[]>([]);
  const [checks, setChecks] = useState<CheckApiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Index weather by "Location, ST"
  const weatherByLoc = useMemo(() => {
    const m: Record<string, WeatherRow> = {};
    for (const w of weather) m[`${w.location}, ${w.state}`] = w;
    return m;
  }, [weather]);

  // Card order: derive from weather rows (ensures known 4 cards)
  const locations = useMemo(
    () => weather.map(w => ({ name: w.location, state: w.state })),
    [weather]
  );

  // For quick toggle lookups per card (location -> { personId: completed })
  const groupedChecks = useMemo(() => {
    const g: Record<string, Record<string, boolean>> = {};
    for (const c of checks) {
      const loc = c.person?.location || '';
      const pid = c.person?.id || '';
      if (!loc || !pid) continue;
      g[loc] ||= {};
      g[loc][pid] = !!c.completed;
    }
    return g;
  }, [checks]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [w, ch] = await Promise.all([getWeather(date), getChecks(date)]);
        if (!active) return;
        setWeather(w || []);
        setChecks(ch || []);
      } catch (e: any) {
        setErr(e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [date]);

  async function toggle(personId: string, completed: boolean) {
    try {
      await setCheck(date, personId, completed);
      // optimistic update
      setChecks(prev =>
        prev.map(c => (c.person.id === personId ? { ...c, completed } : c))
      );
    } catch {
      alert('Failed to update');
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Weather Checks
        </h1>
        <div className="flex items-center gap-2">
          <label className="label">Date</label>
          <input
            className="input"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
      </header>

      {err && <div className="text-red-600 dark:text-red-400">{err}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {locations.map(loc => {
          const key = `${loc.name}, ${loc.state}`;
          const w = weatherByLoc[key];

          // Build people array for this location from the checks API rows
          const peopleForCard = checks
            .filter(c => c.person?.location === loc.name)
            .map(c => ({ id: c.person.id, name: c.person.name }));

          // Build completion map for this card
          const checksForCard = groupedChecks[loc.name] || {};

          return (
            <LocationCard
              key={key}
              name={loc.name}
              state={loc.state}
              weather={
                w
                  ? {
                      highTempF: w.highTempF,
                      rained: w.rained,
                      snowed: w.snowed,
                    }
                  : undefined
              }
              people={peopleForCard}
              checks={checksForCard}
              onToggle={toggle}
            />
          );
        })}
      </div>

      {loading && <div>Loading…</div>}
      {!loading && weather.length === 0 && (
        <div>No data for selected date.</div>
      )}
    </div>
  );
}
