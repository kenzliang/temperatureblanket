import { clsx } from 'clsx';

interface SparklineProps {
  temps: (number | null)[];  // last 7 days, oldest first
  className?: string;
}

export function Sparkline({ temps, className }: SparklineProps) {
  const valid = temps.filter((t): t is number => t != null);
  if (valid.length < 2) return null;

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min;

  // If all temps are within 2°F, the sparkline is visually flat and unhelpful
  if (range < 2) return null;

  const W = 100;
  const H = 28;
  const PAD = 2;

  const points = temps.map((t, i) => {
    if (t == null) return null;
    const x = PAD + (i / (temps.length - 1)) * (W - 2 * PAD);
    const y = H - PAD - ((t - min) / range) * (H - 2 * PAD);
    return { x, y, t };
  }).filter((p): p is { x: number; y: number; t: number } => p != null);

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  return (
    <div className={clsx('inline-flex items-center gap-1.5', className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-24 h-7"
        preserveAspectRatio="none"
      >
        <path
          d={pathD}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-blue-400 dark:text-blue-300"
        />
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r={2.5}
            className="fill-blue-500 dark:fill-blue-300"
          />
        )}
      </svg>
      <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums whitespace-nowrap">
        7d: {Math.round(min)}–{Math.round(max)}°F
      </span>
    </div>
  );
}
