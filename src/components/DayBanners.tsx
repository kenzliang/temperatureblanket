'use client';

interface DayBannersProps {
  loading: boolean;
  isToday: boolean;
  hasWeatherForDate: boolean;
  date: string;
  backfilling: boolean;
  backfillMsg: string | null;
  onBackfill: () => void;
}

export function DayBanners({
  loading,
  isToday,
  hasWeatherForDate,
  date,
  backfilling,
  backfillMsg,
  onBackfill,
}: DayBannersProps) {
  const missingWeather = !loading && !hasWeatherForDate && !isToday;

  return (
    <>
      {!loading && isToday && !hasWeatherForDate && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Today&#39;s weather will be available after the day ends. Check back tomorrow.
          </span>
        </div>
      )}

      {missingWeather && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              {backfillMsg || `Weather data missing for ${date}.`}
            </span>
          </div>
          <button
            onClick={onBackfill}
            disabled={backfilling}
            className="shrink-0 px-3 py-1 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {backfilling ? 'Fetching...' : 'Fetch Now'}
          </button>
        </div>
      )}
    </>
  );
}
