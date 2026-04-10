import { supabase } from '@/lib/supabase/server';
import { todayET, yesterdayET } from '@/lib/dates';

/** How many days before yesterday a weather date can be and still count. */
const RECENCY_WINDOW = 7;

/** After this many days of inactivity, the streak resets to -1. */
export const INACTIVITY_LIMIT_DAYS = 2;

/**
 * Update a person's streak after they check off a date.
 *
 * Rules:
 *   1. The weather date must be within 7 days of yesterday — older dates
 *      don't count (prevents bulk-backfilling to game the streak).
 *   2. If `last_action_date` is already today, do nothing — only one
 *      streak increment per calendar day.
 *   3. Otherwise, increment streak by 1 and set `last_action_date` = today.
 *
 * Only called when `completed = true`.  Unchecking does not affect the streak.
 */
export async function updateStreak(
  personId: string,
  weatherDate: string,
): Promise<number> {
  const today = todayET();
  const yesterday = yesterdayET();

  // ── Guard: weather date must be within RECENCY_WINDOW of yesterday ──
  const cutoff = daysAgo(yesterday, RECENCY_WINDOW);
  if (weatherDate < cutoff || weatherDate > yesterday) {
    // Too old or in the future — no streak credit
    const current = await getCurrentStreak(personId);
    return current;
  }

  // ── Fetch current streak + last_action_date ──
  const { data, error } = await supabase
    .from('people')
    .select('streak, last_action_date')
    .eq('id', personId)
    .single();
  if (error) throw error;

  const currentStreak: number = data?.streak ?? -1;
  const lastAction: string | null = data?.last_action_date ?? null;

  // ── Guard: already counted today ──
  if (lastAction === today) {
    return currentStreak;
  }

  // ── Increment streak and record today ──
  const newStreak = currentStreak + 1;

  const { error: uErr } = await supabase
    .from('people')
    .update({ streak: newStreak, last_action_date: today })
    .eq('id', personId);
  if (uErr) throw uErr;

  return newStreak;
}

/**
 * Reset streaks for all people whose last action was >= INACTIVITY_LIMIT_DAYS ago.
 * Called by the daily cron job (`/api/jobs/check-streaks`).
 */
export async function resetStaleStreaks(): Promise<number> {
  const today = todayET();
  const cutoff = daysAgo(today, INACTIVITY_LIMIT_DAYS);

  // Reset anyone whose last_action_date is on or before the cutoff,
  // or who has never performed an action (last_action_date IS NULL).
  const { data, error } = await supabase
    .from('people')
    .update({ streak: -1 })
    .or(`last_action_date.lte.${cutoff},last_action_date.is.null`)
    .neq('streak', -1)
    .select('id');
  if (error) throw error;

  return data?.length ?? 0;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getCurrentStreak(personId: string): Promise<number> {
  const { data, error } = await supabase
    .from('people')
    .select('streak')
    .eq('id', personId)
    .single();
  if (error) throw error;
  return data?.streak ?? -1;
}

/** Return YYYY-MM-DD that is `n` days before `from`. */
function daysAgo(from: string, n: number): string {
  const d = new Date(from + 'T00:00:00');
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
