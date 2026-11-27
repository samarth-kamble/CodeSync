import type { SyncHistoryEntry } from '@leetsync/shared';

export interface HeatmapDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface SyncAnalytics {
  totalSynced: number;
  todayCount: number;
  currentStreak: number;
  longestStreak: number;
  platformBreakdown: {
    leetcode: number;
    gfg: number;
    hackerrank: number;
    codechef: number;
  };
  heatmapDays: HeatmapDay[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toLocalDateKey(timestampMs: number): string {
  const d = new Date(timestampMs);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getHeatmapLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

export function computeSyncAnalytics(
  history: SyncHistoryEntry[],
  nowMs: number = Date.now(),
  heatmapDayCount: number = 70,
): SyncAnalytics {
  const successful = history.filter((item) => item.status === 'SUCCESS');
  const dayCounts = new Map<string, number>();

  const platformBreakdown = {
    leetcode: 0,
    gfg: 0,
    hackerrank: 0,
    codechef: 0,
  };

  for (const item of successful) {
    const plat = item.platform || 'leetcode';
    if (plat === 'gfg') platformBreakdown.gfg += 1;
    else if (plat === 'hackerrank') platformBreakdown.hackerrank += 1;
    else if (plat === 'codechef') platformBreakdown.codechef += 1;
    else platformBreakdown.leetcode += 1;

    const key = toLocalDateKey(item.timestamp);
    dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
  }

  const todayKey = toLocalDateKey(nowMs);
  const yesterdayKey = toLocalDateKey(nowMs - MS_PER_DAY);
  const todayCount = dayCounts.get(todayKey) || 0;

  // Compute current streak ending today or yesterday
  let currentStreak = 0;
  let cursorMs = dayCounts.has(todayKey)
    ? nowMs
    : dayCounts.has(yesterdayKey)
      ? nowMs - MS_PER_DAY
      : 0;

  while (cursorMs > 0 && dayCounts.has(toLocalDateKey(cursorMs))) {
    currentStreak += 1;
    cursorMs -= MS_PER_DAY;
  }

  // Compute longest streak across all active days
  const sortedDates = Array.from(dayCounts.keys()).sort();
  let longestStreak = 0;
  let runningStreak = 0;
  let prevMidnightMs: number | null = null;

  for (const dateStr of sortedDates) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const midnightMs = new Date(y, m - 1, d).getTime();
    if (prevMidnightMs !== null && Math.round((midnightMs - prevMidnightMs) / MS_PER_DAY) === 1) {
      runningStreak += 1;
    } else {
      runningStreak = 1;
    }
    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
    prevMidnightMs = midnightMs;
  }

  // Build trailing heatmap days (oldest -> newest)
  const heatmapDays: HeatmapDay[] = [];
  for (let offset = heatmapDayCount - 1; offset >= 0; offset--) {
    const date = toLocalDateKey(nowMs - offset * MS_PER_DAY);
    const count = dayCounts.get(date) || 0;
    heatmapDays.push({
      date,
      count,
      level: getHeatmapLevel(count),
    });
  }

  return {
    totalSynced: successful.length,
    todayCount,
    currentStreak,
    longestStreak,
    platformBreakdown,
    heatmapDays,
  };
}
