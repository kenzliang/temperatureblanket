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
  const rainYes = weather?.rained === true;
  const snowYes = weather?.snowed === true;

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {name}, {state}
        </h3>
        <div className="flex gap-2 items-center">
          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {weather ? Math.round(weather.highTempF) : '—'}°F
          </span>

          {/* Rain badge */}
          <span
            className={clsx('badge', rainYes ? 'on' : 'off')}
            title={rainYes ? 'It rained on this date' : 'No measurable rain on this date'}
            aria-label={`Rain: ${rainYes ? 'Yes' : 'No'}`}
          >
            {rainYes ? '✓ Rain: Yes' : 'Rain: No'}
          </span>

          {/* Snow badge */}
          <span
            className={clsx('badge', snowYes ? 'on' : 'off')}
            title={snowYes ? 'It snowed on this date' : 'No snow on this date'}
            aria-label={`Snow: ${snowYes ? 'Yes' : 'No'}`}
          >
            {snowYes ? '✓ Snow: Yes' : 'Snow: No'}
          </span>
        </div>
      </div>

      <div className="mt-3">
        <div className="label mb-2">People</div>
        <div className="flex flex-wrap gap-3">
          {people.map(p => (
            <label
              key={p.id}
              className="inline-flex items-center gap-2 text-gray-900 dark:text-gray-100"
            >
              <input
                type="checkbox"
                checked={!!checks[p.id]}
                onChange={e => onToggle(p.id, e.target.checked)}
              />
              <span className="font-medium">Completed — {p.name}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
