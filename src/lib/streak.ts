import { supabase } from '@/lib/supabase/server';
import { todayET } from '@/lib/dates';

/** After this many days of inactivity, the streak resets to -1. */
export const INACTIVITY_LIMIT_DAYS = 2;

/**
 * Update a person's streak after they check off a date.
 *
 * Rules:
 *   1. If `last_action_date` is already today, do nothing — only one
 *      streak increment per calendar day.
 *   2. Otherwise, increment streak by 1 and set `last_action_date` = today.
 *
 * Only called when `completed = true`.  Unchecking does not affect the streak.
 */
export async function updateStreak(personId: string): Promise<number> {
  const today = todayET();

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

/** Return YYYY-MM-DD that is `n` days before `from`. */
function daysAgo(from: string, n: number): string {
  const d = new Date(from + 'T00:00:00');
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
