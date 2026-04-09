import { supabase } from '@/lib/supabase/server';
import { yesterdayET } from '@/lib/dates';

function dateNDaysAgo(from: string, n: number): string {
  const d = new Date(from + 'T00:00:00');
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isEligible(incompleteDates: string[], yesterday: string): boolean {
  if (incompleteDates.length >= 7) return false;
  const cutoff = dateNDaysAgo(yesterday, 7);
  return incompleteDates.every((d) => d >= cutoff);
}

/**
 * Update streak for a person after a check toggle and persist to DB.
 *
 * The streak is incremental — it does NOT retroactively count past completions.
 * On check-off while eligible: streak += 1
 * On uncheck while still eligible: streak -= 1 (min 0)
 * If not eligible: streak = 0
 */
export async function updateStreak(
  personId: string,
  completed: boolean
): Promise<number> {
  const yesterday = yesterdayET();
  const year = yesterday.slice(0, 4);
  const startDate = `${year}-01-01`;

  // Fetch current streak from people table
  const { data: person, error: pErr } = await supabase
    .from('people')
    .select('streak')
    .eq('id', personId);
  if (pErr) throw pErr;
  const currentStreak = Number(person?.[0]?.streak) || 0;

  // Fetch all checks for the year to determine eligibility
  const { data: checks, error: cErr } = await supabase
    .from('person_checks')
    .select('d, completed')
    .eq('person_id', personId)
    .gte('d', startDate)
    .lte('d', `${year}-12-31`);
  if (cErr) throw cErr;

  const incompleteDates: string[] = [];
  for (const c of checks ?? []) {
    if (!c.completed) incompleteDates.push(c.d);
  }

  let streak: number;

  if (!isEligible(incompleteDates, yesterday)) {
    streak = 0;
  } else if (completed) {
    streak = currentStreak + 1;
  } else {
    streak = Math.max(0, currentStreak - 1);
  }

  // Persist to DB
  const { error: uErr } = await supabase
    .from('people')
    .update({ streak })
    .eq('id', personId);
  if (uErr) throw uErr;

  return streak;
}
