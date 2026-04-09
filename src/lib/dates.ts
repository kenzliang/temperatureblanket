// Timezone-correct date helpers for America/New_York.
//
// PITFALLS TO AVOID:
// 1. Never use new Date().toISOString().slice(0,10) — that returns UTC, not ET.
//    At 11pm ET the UTC date is already tomorrow.
// 2. Never set process.env.TZ — Vercel reserves this environment variable.
// 3. Use Intl.DateTimeFormat with timeZone: 'America/New_York' everywhere.

const ET = 'America/New_York';

/**
 * Format a Date as YYYY-MM-DD in Eastern Time.
 * Uses en-CA locale because it natively produces ISO-style date strings.
 */
export function formatYMD(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ET,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value ?? '';
  const m = parts.find((p) => p.type === 'month')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD for today in ET */
export function todayET(): string {
  return formatYMD(new Date());
}

/**
 * YYYY-MM-DD for yesterday in ET.
 * Subtracts 24h then formats in ET — correct across DST boundaries.
 */
export function yesterdayET(): string {
  const d = new Date();
  d.setUTCHours(d.getUTCHours() - 24);
  return formatYMD(d);
}

/** YYYY-01-01 for the earliest year with data */
export function dataStartDate(): string {
  return '2025-01-01';
}
