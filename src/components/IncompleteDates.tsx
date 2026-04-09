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
  // Original
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

  // Roasty
  'They dropped one stitch and folded like a lawn chair.',
  'Their knitting career ended in the tutorial phase.',
  'They bought the supplies and confused that with talent.',
  'One purl stitch sent them into early retirement.',
  'Their scarf is giving “quit halfway through and blamed the pattern.”',
  'They cast on confidence and cast off immediately.',
  'Their biggest project is avoiding the unfinished one.',
  'They treat every pattern like a personal attack.',
  'The yarn deserved a more committed owner.',
  'They couldn’t finish a dishcloth with a gun to their head.',
  'Their WIP has seen more excuses than stitches.',
  'They got outperformed by a beginner kit.',
  'Their needles have done more sitting than knitting.',
  'They saw “intermediate” and took it as a threat.',
  'Their sweater died before it became sentient.',
  'They’ve started more projects than they’ve finished sentences about them.',
  'They hit one mistake and declared bankruptcy.',
  'Their tension is bad and their follow-through is worse.',
  'Honestly, the yarn gave up on them first.',
  'They turned a relaxing hobby into a public collapse.',
  'Their gauge was off and so was their attitude.',
  'The pattern said “repeat” and they said “absolutely not.”',
  'They got humbled by a pair of wooden sticks.',
  'The only thing they’ve completed is the shopping part.',
  'Their knitting bag is just a graveyard with handles.',
  'They ghosted that scarf like it got too serious.',
  'They have all the tools and none of the fortitude.',
  'Their project is still in the “thoughts and prayers” stage.',
  'At this point the yarn is in a hostage situation.',
  'They don’t knit. They just financially support knitting.',
  'Their blanket has the structural integrity of a fishing net.',
  'They lost a battle of wills to a cardigan.',
  'Every stitch was a cry for help.',
  'They made it six rows before the dream died.',
  'The cat showed more discipline than they did.',

  // Cute / deadpan
  'Their scarf is taking a little longer than expected.',
  'The yarn is currently on an extended vacation.',
  'Their needles are between projects indefinitely.',
  'The blanket remains in its conceptual phase.',
  'They stopped after achieving a few experimental rows.',
  'Their knitting practice is now mostly aspirational.',
  'The project bag is preserving the work for future generations.',
  'They appear to be resting between stitches.',
  'The sweater is progressing very privately.',
  'Their yarn has entered a quiet period.',
  'The next row is apparently a tomorrow problem.',
  'They’re still thinking about the pattern.',
  'The hat is more of a long-term vision now.',
  'Their WIP is enjoying a stable indoor environment.',
  'The scarf will be lovely in a few fiscal quarters.',
  'They paused to reflect and never unpaused.',
  'The needles are on standby.',
  'Their tension relaxed and so did their standards.',
  'The project remains active in spirit.',
  'Their knitting era is simply less visible now.',
  'They completed the important part, which was starting.',
  'The yarn and I are respecting their privacy at this time.',
  'Their stitch count is low but their intentions were excellent.',
  'It’s less unfinished and more slowly revealing itself.',
  'The cardigan is still gathering character.',
  'They’ve transitioned from knitting to contemplating knitting.',
  'The project is currently in soft launch.',
  'Their progress is subtle.',
  'The scarf is taking the scenic route.',
  'They are no longer rushing the creative process.',
  'The yarn remains optimistic.',
  'Their blanket is still becoming.',
  'The pattern was received and emotionally processed.',
  'Their knitting has become more of a seasonal offering.',
  'The project is on a gentle little pause.',
];

function pickQuip(): string {
  return QUIPS[Math.floor(Math.random() * QUIPS.length)];
}

function formatShortDate(d: string): string {
  const [, m, day] = d.split('-');
  return `${parseInt(m)}/${parseInt(day)}`;
}

export function IncompleteDates({ progress, onSelectDate }: IncompleteDatesProps) {
  const withIncomplete = progress.filter((p) => p.incompleteDates.length > 0);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Pick a random quip per person on mount; stable across re-renders, new on refresh
  const quipMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of withIncomplete) {
      m[p.personId] = pickQuip();
    }
    return m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                  {quipMap[p.personId] ?? pickQuip()}
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
