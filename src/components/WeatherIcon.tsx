import { clsx } from 'clsx';

interface WeatherIconProps {
  rained: boolean;
  snowed: boolean;
}

function SunIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="4" fill="currentColor" opacity={0.2} stroke="currentColor" />
      <path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
    </svg>
  );
}

function RainIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M4.5 13a6.5 6.5 0 1112.775-2.125A4.5 4.5 0 0119.5 13H4.5z" fill="currentColor" opacity={0.15} />
      <path strokeLinecap="round" d="M8 15v3m4-4v3m4-2v3" />
    </svg>
  );
}

function SnowIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M4.5 13a6.5 6.5 0 1112.775-2.125A4.5 4.5 0 0119.5 13H4.5z" fill="currentColor" opacity={0.15} />
      <circle cx="8" cy="17" r="1" fill="currentColor" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
      <circle cx="16" cy="17" r="1" fill="currentColor" />
      <circle cx="10" cy="19" r="1" fill="currentColor" />
      <circle cx="14" cy="19" r="1" fill="currentColor" />
    </svg>
  );
}

export function WeatherIcon({ rained, snowed }: WeatherIconProps) {
  if (snowed) {
    return (
      <span className={clsx('inline-flex items-center gap-1 text-blue-500 dark:text-blue-300')} title="It snowed">
        <SnowIcon />
        <span className="text-xs font-medium">Snow</span>
      </span>
    );
  }
  if (rained) {
    return (
      <span className={clsx('inline-flex items-center gap-1 text-sky-600 dark:text-sky-400')} title="It rained">
        <RainIcon />
        <span className="text-xs font-medium">Rain</span>
      </span>
    );
  }
  return (
    <span className={clsx('inline-flex items-center gap-1 text-amber-500 dark:text-amber-400')} title="Clear">
      <SunIcon />
      <span className="text-xs font-medium">Clear</span>
    </span>
  );
}
