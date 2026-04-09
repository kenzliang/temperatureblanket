interface PersonProgress {
  personId: string;
  personName: string;
  locationName: string;
  completedDays: number;
  totalDays: number;
}

interface ProgressTrackerProps {
  progress: PersonProgress[];
}

function progressColor(pct: number): string {
  if (pct >= 100) return 'bg-green-500 dark:bg-green-400';
  if (pct >= 75) return 'bg-blue-500 dark:bg-blue-400';
  if (pct >= 50) return 'bg-yellow-500 dark:bg-yellow-400';
  return 'bg-red-400 dark:bg-red-500';
}

export function ProgressTracker({ progress }: ProgressTrackerProps) {
  if (progress.length === 0) return null;

  return (
    <div className="card">
      <h3 className="label mb-3">Year-to-Date Progress</h3>
      <div className="space-y-2.5">
        {progress.map((p) => {
          const pct = p.totalDays > 0 ? (p.completedDays / p.totalDays) * 100 : 0;
          return (
            <div key={p.personId}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {p.personName}
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">
                    ({p.locationName})
                  </span>
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                  {p.completedDays}/{p.totalDays}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${progressColor(pct)}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
