import { clsx } from 'clsx';
import { WeatherIcon } from './WeatherIcon';
import { Sparkline } from './Sparkline';
import { getPersonColorMap, getYarnForTemp, contrastText } from '@/lib/yarn-colors';

interface WeatherData {
  highTempF: number;
  rained: boolean;
  snowed: boolean;
}

interface Person {
  id: string;
  name: string;
}

interface LocationCardProps {
  name: string;
  state: string;
  weather?: WeatherData;
  people: Person[];
  checks: Record<string, boolean>;
  onToggle: (personId: string, completed: boolean) => void;
  trendTemps?: (number | null)[];
}

function tempColorClass(f: number): string {
  if (f <= 10) return 'text-blue-700 dark:text-blue-300';
  if (f <= 25) return 'text-blue-500 dark:text-blue-400';
  if (f <= 40) return 'text-cyan-600 dark:text-cyan-400';
  if (f <= 55) return 'text-green-600 dark:text-green-400';
  if (f <= 70) return 'text-yellow-600 dark:text-yellow-400';
  if (f <= 85) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

export function LocationCard({
  name,
  state,
  weather,
  people,
  checks,
  onToggle,
  trendTemps,
}: LocationCardProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {name}, {state}
        </h3>
        <div className="flex gap-2 items-center flex-wrap">
          <span
            className={clsx(
              'text-xl font-bold',
              weather != null
                ? tempColorClass(weather.highTempF)
                : 'text-gray-400 dark:text-gray-500'
            )}
          >
            {weather != null ? `${Math.round(weather.highTempF)}°F` : '—°F'}
          </span>

          {weather != null ? (
            <WeatherIcon rained={weather.rained} snowed={weather.snowed} />
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">No data</span>
          )}
        </div>
      </div>

      {/* 7-day trend sparkline */}
      {trendTemps && trendTemps.some((t) => t != null) && (
        <div className="mt-2">
          <Sparkline temps={trendTemps} />
        </div>
      )}

      <div className="mt-3">
        <div className="label mb-2">People</div>
        <div className="flex flex-wrap gap-3">
          {people.map((p) => {
            const colorMap = getPersonColorMap(p.name);
            const yarn = colorMap && weather ? getYarnForTemp(colorMap, weather.highTempF) : null;

            return (
              <label
                key={p.id}
                className={clsx(
                  'inline-flex items-center gap-2 cursor-pointer rounded-lg px-3 py-1.5 transition-colors',
                  !yarn && 'text-gray-900 dark:text-gray-100',
                )}
                style={yarn ? {
                  backgroundColor: yarn.hex,
                  color: contrastText(yarn.hex),
                } : undefined}
              >
                <input
                  type="checkbox"
                  checked={!!checks[p.id]}
                  onChange={(e) => onToggle(p.id, e.target.checked)}
                />
                <span className="font-medium">{p.name}</span>
                {yarn && (
                  <span className="text-xs opacity-80">{yarn.label}</span>
                )}
              </label>
            );
          })}
          {people.length === 0 && (
            <span className="text-gray-400 dark:text-gray-500 text-sm">
              No people assigned
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
