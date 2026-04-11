'use client';

import { useCallback, useEffect, useState } from 'react';
import type { StatsResponse } from '@/types';

export function useStats(year: string): { stats: StatsResponse | null; refreshStats: () => void } {
  const [stats, setStats] = useState<StatsResponse | null>(null);

  const fetchStats = useCallback(() => {
    fetch(`/api/stats?year=${year}`)
      .then((r) => r.json())
      .then((s) => { if (s.calendar && s.progress) setStats(s); })
      .catch(() => {});
  }, [year]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, refreshStats: fetchStats };
}
