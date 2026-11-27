import { Card, CardContent } from '../../components/ui/Card';
import { Flame, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { SyncHistoryEntry } from '@leetsync/shared';
import { computeSyncAnalytics } from '../../analytics/streak';

interface StatsCardProps {
  syncHistory: SyncHistoryEntry[];
}

const HEATMAP_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-slate-800/80',
  1: 'bg-emerald-950',
  2: 'bg-emerald-800',
  3: 'bg-emerald-600',
  4: 'bg-emerald-400',
};

export function StatsCard({ syncHistory }: StatsCardProps) {
  const analytics = computeSyncAnalytics(syncHistory, Date.now(), 28);

  return (
    <Card className="py-2.5">
      <CardContent className="space-y-2.5">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-slate-900/80 border border-slate-800/80 px-2.5 py-1.5">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <Flame className="w-3 h-3 text-orange-400" /> Streak
            </div>
            <div className="text-xs font-mono font-semibold text-white mt-0.5">
              {analytics.currentStreak}d
            </div>
          </div>

          <div className="rounded-lg bg-slate-900/80 border border-slate-800/80 px-2.5 py-1.5">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Today
            </div>
            <div className="text-xs font-mono font-semibold text-white mt-0.5">
              {analytics.todayCount} solved
            </div>
          </div>

          <div className="rounded-lg bg-slate-900/80 border border-slate-800/80 px-2.5 py-1.5">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <ShieldCheck className="w-3 h-3 text-sky-400" /> Total
            </div>
            <div className="text-xs font-mono font-semibold text-white mt-0.5">
              {analytics.totalSynced}
            </div>
          </div>
        </div>

        {/* Platform breakdown */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
          <span>Platforms</span>
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-amber-300">LC: {analytics.platformBreakdown.leetcode}</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400">GFG: {analytics.platformBreakdown.gfg}</span>
            <span className="text-slate-600">•</span>
            <span className="text-sky-400">HR: {analytics.platformBreakdown.hackerrank}</span>
          </div>
        </div>

        {/* Compact 28-day mini heatmap */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>Last 28 days</span>
            <span>Best: {analytics.longestStreak}d</span>
          </div>
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}>
            {analytics.heatmapDays.map((day) => (
              <div
                key={day.date}
                title={`${day.date}: ${day.count} ${day.count === 1 ? 'solution' : 'solutions'}`}
                className={`h-2.5 rounded-[2px] ${HEATMAP_COLORS[day.level]}`}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
