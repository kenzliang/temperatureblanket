import { useEffect, useMemo, useState } from 'react';
import './styles.css';
import { getChecks, getWeather, setCheck } from './api';
import { LocationCard } from './components/LocationCard';

type WeatherRow = {
  location: string;
  state: string;
  highTempF: number | null;
  rained: boolean;
  snowed: boolean;
};

type CheckApiRow = {
  person: {
    id: string;
    name: string;
    location: string | null;
  };
  completed: boolean;
};

/* -------- ET helpers -------- */

function formatYMD(d: Date, tz = 'America/New_York'): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const da = parts.find(p => p.type === 'day')?.value;
  return `${y}-${m}-${da}`;
}

function todayET(): string {
  return formatYMD(new Date());
}

function yesterdayET(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return formatYMD(now);
}

function yearStartET(): string {
  const now = new Date();
  const year = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
  }).format(now);
  return `${year}-01-01`;
}

/* -------- Component -------- */

export default function App() {
  const [date, setDate] = useState<string>(yesterdayET());
  const [weather, setWeather] = useState<WeatherRow[]>([]);
  const [checks, setChecks] = useState<CheckApiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const weatherByLoc = useMemo(() => {
    const m: Record<string, WeatherRow> = {};
    for (const w of weather) m[`${w.location}, ${w.state}`] = w;
    return m;
  }, [weather]);

  const locations = useMemo(
    () => weather.map(w => ({ name: w.location, state: w.state })),
    [weather]
  );

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
        <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white">
          Valerie's Temperature Blanket Project
        </h1>
        <div className="flex items-center gap-2">
          <label className="label">Date</label>
          <input
            className="input"
            type="date"
            value={date}
            min={yearStartET()}
            max={todayET()}
            onChange={e => setDate(e.target.value)}
          />
        </div>
      </header>

      {err && <div className="text-red-600 dark:text-red-400">{err}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {locations.map(loc => {
          const key = `${loc.name}, ${loc.state}`;
          const w = weatherByLoc[key];
          const peopleForCard = checks
            .filter(c => c.person?.location === loc.name)
            .map(c => ({ id: c.person.id, name: c.person.name }));
          const checksForCard = groupedChecks[loc.name] || {};
          const weatherForCard =
            w && Number.isFinite(Number(w.highTempF))
              ? {
                  highTempF: Number(w.highTempF),
                  rained: w.rained,
                  snowed: w.snowed,
                }
              : undefined;
          return (
            <LocationCard
              key={key}
              name={loc.name}
              state={loc.state}
              weather={weatherForCard}
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
