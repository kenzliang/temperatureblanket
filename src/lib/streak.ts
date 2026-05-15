import { supabase } from '@/lib/supabase/server';
import { todayET, yesterdayET } from '@/lib/dates';

/** After this many days of inactivity, the streak resets to -1. */
export const INACTIVITY_LIMIT_DAYS = 2;

/**
 * Update a person's streak after they check off a date.
 *
 * Rules:
 *   1. Only called when `completed = true`. Unchecking does not affect the streak.
 *   2. Only increments for recent dates (yesterday or today) — old backfills
 *      do not inflate the streak.
 *   3. If `last_action_date` is already today, do nothing — only one
 *      streak increment per calendar day.
 *   4. Otherwise, increment streak by 1 and set `last_action_date` = today.
 */
export async function updateStreak(
  personId: string,
  toggledDate: string
): Promise<number> {
  const today = todayET();
  const yesterday = yesterdayET();

  // Only increment for recent dates — old backfills don't count
  if (toggledDate !== today && toggledDate !== yesterday) {
    // Fetch and return current streak without changing it
    const { data } = await supabase
      .from('people')
      .select('streak')
      .eq('id', personId);
    return Number(data?.[0]?.streak) || 0;
  }

  // ── Fetch current streak + last_action_date ──
  const { data, error } = await supabase
    .from('people')
    .select('streak, last_action_date')
    .eq('id', personId);
  if (error) throw error;

  const currentStreak: number = Number(data?.[0]?.streak) ?? -1;
  const lastAction: string | null = data?.[0]?.last_action_date ?? null;

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

/** Return YYYY-MM-DD that is `n` days before `from`. */
function daysAgo(from: string, n: number): string {
  const d = new Date(from + 'T00:00:00');
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
