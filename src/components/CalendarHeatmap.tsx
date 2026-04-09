'use client';

import { useMemo, useState } from 'react';
import { clsx } from 'clsx';

interface DaySummary {
  date: string;
  avgTempF: number | null;
  hasWeather: boolean;
}

interface CalendarHeatmapProps {
  data: DaySummary[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  minDate: string;
  maxDate: string;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Temperature → color gradient (matching LocationCard's tempColorClass)
// Returns both bg and text classes for the cell
function tempCellClasses(tempF: number | null | undefined): string {
  if (tempF == null) return 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400';
  if (tempF <= 10) return 'bg-blue-300 dark:bg-blue-800 text-blue-950 dark:text-blue-100';
  if (tempF <= 25) return 'bg-blue-200 dark:bg-blue-700/70 text-blue-900 dark:text-blue-100';
  if (tempF <= 40) return 'bg-cyan-200 dark:bg-cyan-800/60 text-cyan-900 dark:text-cyan-100';
  if (tempF <= 55) return 'bg-green-200 dark:bg-green-800/60 text-green-900 dark:text-green-100';
  if (tempF <= 70) return 'bg-yellow-200 dark:bg-yellow-700/50 text-yellow-900 dark:text-yellow-100';
  if (tempF <= 85) return 'bg-orange-200 dark:bg-orange-800/60 text-orange-900 dark:text-orange-100';
  return 'bg-red-300 dark:bg-red-800/70 text-red-950 dark:text-red-100';
}

function tempLabel(tempF: number): string {
  if (tempF <= 10) return '<10°F';
  if (tempF <= 25) return '<25°F';
  if (tempF <= 40) return '<40°F';
  if (tempF <= 55) return '<55°F';
  if (tempF <= 70) return '<70°F';
  if (tempF <= 85) return '<85°F';
  return '85°F+';
}

export function CalendarHeatmap({
  data,
  selectedDate,
  onSelectDate,
  minDate,
  maxDate,
}: CalendarHeatmapProps) {
  const dataMap = useMemo(() => {
    const m = new Map<string, DaySummary>();
    for (const d of data) m.set(d.date, d);
    return m;
  }, [data]);

  // Month navigation state — starts on the selected date's month
  const [viewYear, setViewYear] = useState(() => parseInt(selectedDate.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => parseInt(selectedDate.slice(5, 7)) - 1);

  const minYear = parseInt(minDate.slice(0, 4));
  const minMonth = parseInt(minDate.slice(5, 7)) - 1;
  const maxYear = parseInt(maxDate.slice(0, 4));
  const maxMonth = parseInt(maxDate.slice(5, 7)) - 1;

  const canGoPrev = viewYear > minYear || (viewYear === minYear && viewMonth > minMonth);
  const canGoNext = viewYear < maxYear || (viewYear === maxYear && viewMonth < maxMonth);

  function prevMonth() {
    if (!canGoPrev) return;
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  }

  function nextMonth() {
    if (!canGoNext) return;
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  }

  // Build the month grid
  const weeks = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const startDow = firstDay.getDay();

    const weeks: (number | null)[][] = [];
    let week: (number | null)[] = new Array(startDow).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day);
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }
    return weeks;
  }, [viewYear, viewMonth]);

  function dateStr(day: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Legend: representative temp steps
  const legendSteps: { tempF: number; label: string }[] = [
    { tempF: 5, label: 'Cold' },
    { tempF: 35, label: '' },
    { tempF: 55, label: '' },
    { tempF: 75, label: '' },
    { tempF: 90, label: 'Hot' },
  ];

  return (
    <div className="card">
      {/* ── Month header with arrows ──────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            disabled={!canGoPrev}
            aria-label="Previous month"
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-default transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="label px-1 select-none">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h3>
          <button
            onClick={nextMonth}
            disabled={!canGoNext}
            aria-label="Next month"
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-default transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        {/* Temperature legend */}
        <div className="flex items-center gap-0.5 text-[10px] text-gray-500 dark:text-gray-400">
          <span className="mr-1">Cold</span>
          {legendSteps.map((s, i) => (
            <span
              key={i}
              className={clsx('w-3 h-3 rounded-sm', tempCellClasses(s.tempF))}
            />
          ))}
          <span className="ml-1">Hot</span>
        </div>
      </div>

      {/* ── Calendar grid ─────────────────────────────────────────────── */}
      <table className="w-full table-fixed text-center text-xs">
        <thead>
          <tr>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <th key={i} className="py-1 text-gray-400 dark:text-gray-500 font-normal">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((day, di) => {
                if (day === null) {
                  return <td key={di} className="py-0.5" />;
                }
                const ds = dateStr(day);
                const isFuture = ds > maxDate;
                const isBeforeMin = ds < minDate;
                const isSelected = ds === selectedDate;
                const daySummary = dataMap.get(ds);
                const disabled = isFuture || isBeforeMin;

                const tempClasses = daySummary?.hasWeather
                  ? tempCellClasses(daySummary.avgTempF)
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500';

                return (
                  <td key={di} className="py-0.5">
                    <button
                      disabled={disabled}
                      onClick={() => !disabled && onSelectDate(ds)}
                      title={
                        isFuture
                          ? 'Future date'
                          : !daySummary?.hasWeather
                            ? 'No weather data'
                            : `Avg ${Math.round(daySummary.avgTempF!)}°F`
                      }
                      className={clsx(
                        'w-7 h-7 rounded-md text-xs font-medium transition-colors',
                        disabled ? 'cursor-default opacity-40' : 'cursor-pointer hover:opacity-80',
                        isSelected && 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900',
                        isFuture
                          ? 'bg-gray-50 dark:bg-gray-900 text-gray-300 dark:text-gray-700'
                          : tempClasses,
                      )}
                    >
                      {day}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
