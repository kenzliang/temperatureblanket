'use client';

import { useMemo, useState } from 'react';

interface PersonProgress {
  personId: string;
  personName: string;
  locationName: string;
  completedDays: number;
  totalDays: number;
  incompleteDates: string[];
}

interface IncompleteDatesProps {
  progress: PersonProgress[];
  onSelectDate: (date: string) => void;
}

const QUIPS = [
  'Looks like they gave up on knitting entirely.',
  'Must have had a knitting accident.',
  'Their yarn stash is collecting dust.',
  'The needles have gone into hibernation.',
  'Rumor has it they switched to crochet.',
  'Never quite got off the starting stitch.',
  'Their blanket is more hole than blanket at this point.',
  'Lost in the yarn aisle, never seen again.',
  'Turns out knitting every day is... hard.',
  'The cat probably claimed the yarn by now.',
];

function pickQuip(personId: string): string {
  // Hash personId + today's date so the quip is stable for the day but changes tomorrow
  const seed = personId + new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return QUIPS[Math.abs(hash) % QUIPS.length];
}

function formatShortDate(d: string): string {
  const [, m, day] = d.split('-');
  return `${parseInt(m)}/${parseInt(day)}`;
}

export function IncompleteDates({ progress, onSelectDate }: IncompleteDatesProps) {
  const withIncomplete = progress.filter((p) => p.incompleteDates.length > 0);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (withIncomplete.length === 0) {
    return (
      <div className="card">
        <h3 className="label mb-2">Incomplete Dates</h3>
        <p className="text-sm text-green-600 dark:text-green-400">
          All caught up! No incomplete dates.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="label mb-3">Incomplete Dates</h3>
      <div className="space-y-3">
        {withIncomplete.map((p) => {
          const missingPct = p.totalDays > 0
            ? (p.incompleteDates.length / p.totalDays) * 100
            : 0;
          const showQuip = missingPct > 30;

          const isExpanded = expanded === p.personId;
          const preview = p.incompleteDates.slice(-5);
          const hasMore = p.incompleteDates.length > 5;
          const displayDates = isExpanded ? p.incompleteDates : preview;

          return (
            <div key={p.personId}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {p.personName}
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">
                    ({p.locationName})
                  </span>
                </span>
                <span className="text-xs text-red-500 dark:text-red-400 font-medium tabular-nums">
                  {p.incompleteDates.length} missing
                </span>
              </div>

              {showQuip ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                  {pickQuip(p.personId)}
                </p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {displayDates.map((d) => (
                    <button
                      key={d}
                      onClick={() => onSelectDate(d)}
                      className="text-[11px] px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors tabular-nums"
                      title={`Go to ${d}`}
                    >
                      {formatShortDate(d)}
                    </button>
                  ))}
                  {hasMore && !isExpanded && (
                    <button
                      onClick={() => setExpanded(p.personId)}
                      className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      +{p.incompleteDates.length - 5} more
                    </button>
                  )}
                  {isExpanded && (
                    <button
                      onClick={() => setExpanded(null)}
                      className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      show less
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
