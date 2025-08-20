import { clsx } from 'clsx';

export function LocationCard({
  name,
  state,
  weather,
  people,
  checks,
  onToggle
}: {
  name: string;
  state: string;
  weather?: { highTempF: number; rained: boolean; snowed: boolean };
  people: { id: string; name: string }[];
  checks: Record<string, boolean>;
  onToggle: (personId: string, completed: boolean) => void;
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{name}, {state}</h3>
        <div className="flex gap-2 items-center">
          <span className="text-xl font-bold">{weather ? Math.round(weather.highTempF) : '—'}°F</span>
          <span className={clsx('badge', weather?.rained ? 'on' : 'off')}>☔ Rain</span>
          <span className={clsx('badge', weather?.snowed ? 'on' : 'off')}>❄ Snow</span>
        </div>
      </div>
      <div className="mt-3">
        <div className="label mb-2">People</div>
        <div className="flex flex-wrap gap-3">
          {people.map(p => (
            <label key={p.id} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!checks[p.id]}
                onChange={e => onToggle(p.id, e.target.checked)}
              />
              <span>Completed — {p.name}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}