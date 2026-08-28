'use client';

import { useEffect, useRef } from 'react';
import { todayET, yesterdayET } from '@/lib/dates';

interface DateNavProps {
  date: string;
  minDate: string;
  maxDate: string;
  onChange: (d: string) => void;
}

export function DateNav({ date, minDate, maxDate, onChange }: DateNavProps) {
  const canGoPrev = date > minDate;
  const canGoNext = date < maxDate;
  const inputRef = useRef<HTMLInputElement>(null);

  // The native calendar popup doesn't re-sync its displayed month when the
  // bound `value` changes programmatically while it's still open (e.g. the
  // user advances via the arrow buttons or quick-jump buttons without
  // closing the popup first) — it can be left showing a stale month even
  // though the input's value and max are already correct. Blurring closes
  // it, so the next open always starts from the current value.
  function jumpTo(d: string) {
    inputRef.current?.blur();
    onChange(d);
  }

  function shiftDate(days: number) {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const next = `${y}-${m}-${dd}`;
    if (next >= minDate && next <= maxDate) jumpTo(next);
  }

  // Keyboard arrow navigation — re-registers each render so it always sees the latest date.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); shiftDate(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); shiftDate(1); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="sticky top-0 z-10 bg-gray-50/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-5xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900 dark:text-white truncate">
            Temperature Blanket Tracker
          </h1>
          <div className="flex items-center gap-1 shrink-0">
            <label className="label hidden sm:block mr-1" htmlFor="date-picker">
              Date
            </label>
            <button
              onClick={() => shiftDate(-1)}
              disabled={!canGoPrev}
              aria-label="Previous day"
              className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <input
              ref={inputRef}
              id="date-picker"
              type="date"
              className="input bg-white text-gray-900 dark:bg-slate-800 dark:text-slate-100 dark:[color-scheme:dark]"
              value={date}
              min={minDate}
              max={maxDate}
              onChange={(e) => onChange(e.target.value)}
            />
            <button
              onClick={() => shiftDate(1)}
              disabled={!canGoNext}
              aria-label="Next day"
              className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        {/* Quick jump buttons */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => jumpTo(yesterdayET())}
            className="text-xs px-2 py-1 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Yesterday
          </button>
          <button
            onClick={() => jumpTo(todayET())}
            className="text-xs px-2 py-1 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Today
          </button>
        </div>
      </div>
    </div>
  );
}
