import { useEffect, useMemo, useState } from 'react';
import './styles.css';
import { getChecks, getWeather, setCheck } from './api';
import { yesterdayET } from './lib/date';
import { LocationCard } from './components/LocationCard';

export default function App() {
  const [date, setDate] = useState<string>(yesterdayET());
  const [weather, setWeather] = useState<any[]>([]);
  const [checks, setChecks] = useState<any[]>([]);
  const [roster, setRoster] = useState<{ [loc: string]: { state: string; people: { id: string; name: string }[] } }>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Build roster from checks response once (has names + locations)
  const checkMap = useMemo(() => {
    const byLoc: any = {};
    for (const c of checks) {
      const loc = c.location;
      byLoc[loc] ||= { state: '', people: [] };
      byLoc[loc].people.push({ id: c.personId, name: c.name });
    }
    return byLoc;
  }, [checks]);

  const groupedChecks = useMemo(() => {
    const g: Record<string, Record<string, boolean>> = {};
    for (const c of checks) {
      g[c.location] ||= {};
      g[c.location][c.personId] = c.completed;
    }
    return g;
  }, [checks]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const [w, ch] = await Promise.all([getWeather(date), getChecks(date)]);
        if (!active) return;
        setWeather(w);
        setChecks(ch);
      } catch (e: any) {
        setErr(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [date]);

  async function toggle(personId: string, completed: boolean) {
    try {
      await setCheck(date, personId, completed);
      setChecks(prev => prev.map(c => c.personId === personId ? { ...c, completed } : c));
    } catch (e: any) {
      alert('Failed to update');
    }
  }

  const weatherByLoc = useMemo(() => {
    const m: any = {};
    for (const w of weather) m[`${w.location}, ${w.state}`] = w;
    return m;
  }, [weather]);

  const locations = useMemo(() => {
    // Derive location list from weather response order
    return weather.map(w => ({ name: w.location, state: w.state }));
  }, [weather]);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Weather Checks</h1>
        <div className="flex items-center gap-2">
          <label className="label">Date</label>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </header>

      {err && <div className="text-red-600">{err}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {locations.map(loc => (
          <LocationCard
            key={`${loc.name}, ${loc.state}`}
            name={loc.name}
            state={loc.state}
            weather={weatherByLoc[`${loc.location || loc.name}, ${loc.state}`]}
            people={(checks.filter(c => c.location === loc.name)).map((c: any) => ({ id: c.personId, name: c.name }))}
            checks={groupedChecks[loc.name] || {}}
            onToggle={toggle}
          />
        ))}
      </div>

      {loading && <div>Loading…</div>}
      {!loading && weather.length === 0 && <div>No data for selected date.</div>}
    </div>
  );
}