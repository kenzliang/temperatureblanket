'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarHeatmap } from '@/components/CalendarHeatmap';
import { ProgressTracker } from '@/components/ProgressTracker';
import { IncompleteDates } from '@/components/IncompleteDates';
import { DateNav } from '@/components/DateNav';
import { DayBanners } from '@/components/DayBanners';
import { LocationGrid } from '@/components/LocationGrid';
import { useSwipe } from '@/components/useSwipe';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useStats } from '@/hooks/useStats';
import { todayET, yesterdayET, dataStartDate } from '@/lib/dates';
import { readLastDate, writeLastDate } from '@/lib/cache';

export default function HomePage() {
  const minDate = dataStartDate();
  const maxDate = todayET();

  // Start with SSR-safe default; hydrate from localStorage in useEffect.
  const [date, setDateRaw] = useState<string>(yesterdayET);
  const [transitioning, setTransitioning] = useState(false);

  const setDate = useCallback((d: string) => {
    setDateRaw(d);
    writeLastDate(d);
  }, []);

  // Restore last-visited date from localStorage on mount.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const savedDate = readLastDate(minDate, maxDate);
    if (savedDate && savedDate !== date) setDateRaw(savedDate);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { stats, refreshStats } = useStats(date.slice(0, 4));
  const { weather, checks, loading, err, toggle, backfilling, backfillMsg, backfillDate } =
    useWeatherData(date, { onCheckToggled: refreshStats });

  function changeDate(newDate: string) {
    if (newDate === date) return;
    setTransitioning(true);
    setTimeout(() => { setDate(newDate); setTransitioning(false); }, 150);
  }

  // Swipe: left = forward, right = backward.
  function shiftDate(days: number) {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const next = `${y}-${m}-${dd}`;
    if (next >= minDate && next <= maxDate) changeDate(next);
  }

  const swipeHandlers = useSwipe(
    () => shiftDate(1),   // swipe left → forward
    () => shiftDate(-1),  // swipe right → backward
  );

  const noData = !loading && weather.length === 0 && checks.length === 0 && !err;

  return (
    <div
      className="min-h-screen bg-gray-50 text-gray-900 dark:bg-slate-900 dark:text-slate-100"
      {...swipeHandlers}
    >
      <DateNav date={date} minDate={minDate} maxDate={maxDate} onChange={changeDate} />

      <div
        className={`max-w-5xl mx-auto p-4 space-y-6 transition-opacity duration-150 ${
          transitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {err && (
          <div role="alert" className="text-red-600 dark:text-red-400">
            {err}
          </div>
        )}

        <DayBanners
          loading={loading}
          isToday={date === maxDate}
          hasWeatherForDate={weather.length > 0}
          date={date}
          backfilling={backfilling}
          backfillMsg={backfillMsg}
          onBackfill={backfillDate}
        />

        <LocationGrid
          loading={loading}
          weather={weather}
          checks={checks}
          trends={stats?.trends}
          onToggle={toggle}
        />

        {noData && (
          <div className="text-gray-500 dark:text-gray-400 text-center py-8">
            No data for {date}.
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CalendarHeatmap
              data={stats.calendar}
              selectedDate={date}
              onSelectDate={changeDate}
              minDate={minDate}
              maxDate={maxDate}
            />
            <ProgressTracker progress={stats.progress} />
          </div>
        )}

        {stats && (
          <IncompleteDates progress={stats.progress} onSelectDate={changeDate} />
        )}
      </div>
    </div>
  );
}
