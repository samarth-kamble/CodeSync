import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import {
  Search,
  GitCommit,
  ExternalLink,
  RotateCcw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Flame,
  Trophy,
  Calendar,
} from 'lucide-react';
import { getProblemUrl, type SyncHistoryEntry } from '@leetsync/shared';
import { computeSyncAnalytics } from '../../analytics/streak';

interface HistoryTabProps {
  history: SyncHistoryEntry[];
  onClearHistory: () => Promise<void>;
  onRetrySync: (entry: SyncHistoryEntry) => Promise<{ status: string; error?: string }>;
}

/**
 * Serializes history entries into formatted JSON, omitting raw cached code payloads.
 */
export function serializeHistoryForExport(history: SyncHistoryEntry[]): string {
  const sanitized = history.map(({ code: _code, ...rest }) => rest);
  return JSON.stringify(sanitized, null, 2);
}

export function filterHistoryEntries(
  history: SyncHistoryEntry[],
  search: string,
  filter: 'ALL' | 'SUCCESS' | 'FAILED' | 'SKIPPED',
  platformFilter: 'ALL' | 'leetcode' | 'gfg' | 'hackerrank' = 'ALL',
): SyncHistoryEntry[] {
  const query = search.trim().toLowerCase();
  return history.filter((item) => {
    const itemPlatform = item.platform || 'leetcode';
    const matchesPlatform = platformFilter === 'ALL' || itemPlatform === platformFilter;

    const matchesSearch =
      !query ||
      item.questionTitle.toLowerCase().includes(query) ||
      item.questionFrontendId.toLowerCase().includes(query) ||
      item.lang.toLowerCase().includes(query);

    const matchesFilter = filter === 'ALL' || item.status === filter;
    return matchesPlatform && matchesSearch && matchesFilter;
  });
}

export function HistoryTab({ history, onClearHistory, onRetrySync }: HistoryTabProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED' | 'SKIPPED'>('ALL');
  const [platformFilter, setPlatformFilter] = useState<'ALL' | 'leetcode' | 'gfg' | 'hackerrank'>('ALL');
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryFeedback, setRetryFeedback] = useState<{ id: string; message: string; isError: boolean } | null>(null);

  const platformScopedHistory =
    platformFilter === 'ALL'
      ? history
      : history.filter((item) => (item.platform || 'leetcode') === platformFilter);
  const filtered = filterHistoryEntries(history, search, filter, platformFilter);
  const analytics = computeSyncAnalytics(platformScopedHistory, Date.now(), 168);
  const totalPlatformSolves =
    analytics.platformBreakdown.leetcode +
    analytics.platformBreakdown.gfg +
    analytics.platformBreakdown.hackerrank;
  const lcPct =
    totalPlatformSolves > 0
      ? Math.round((analytics.platformBreakdown.leetcode / totalPlatformSolves) * 100)
      : 0;
  const gfgPct =
    totalPlatformSolves > 0
      ? Math.round((analytics.platformBreakdown.gfg / totalPlatformSolves) * 100)
      : 0;
  const hrPct = totalPlatformSolves > 0 ? Math.max(0, 100 - lcPct - gfgPct) : 0;

  // Align 24-week grid to Sunday..Saturday rows so Mon/Wed/Fri labels match actual weekdays
  const firstDateParts = analytics.heatmapDays[0]?.date.split('-').map(Number);
  const leadingPad = firstDateParts
    ? new Date(firstDateParts[0], firstDateParts[1] - 1, firstDateParts[2]).getDay()
    : 0;
  const paddedDays: Array<(typeof analytics.heatmapDays)[number] | null> = [
    ...Array.from({ length: leadingPad }, () => null),
    ...analytics.heatmapDays,
  ];
  const weeks: Array<typeof paddedDays> = [];
  for (let i = 0; i < paddedDays.length; i += 7) {
    weeks.push(paddedDays.slice(i, i + 7));
  }

  const HEATMAP_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
    0: 'bg-slate-800/70 border-slate-800',
    1: 'bg-emerald-950 border-emerald-800/70',
    2: 'bg-emerald-800 border-emerald-600/70',
    3: 'bg-emerald-600 border-emerald-400/70',
    4: 'bg-emerald-400 border-emerald-300',
  };

  const handleExport = () => {
    const json = serializeHistoryForExport(history);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];
    const link = document.createElement('a');
    link.href = url;
    link.download = `codesync-history-${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRetryClick = async (entry: SyncHistoryEntry) => {
    setRetryingId(entry.id);
    setRetryFeedback(null);
    try {
      const res = await onRetrySync(entry);
      if (res.status === 'SUCCESS') {
        setRetryFeedback({
          id: entry.id,
          message: `Successfully synced #${entry.questionFrontendId} ${entry.questionTitle}.`,
          isError: false,
        });
      } else {
        setRetryFeedback({
          id: entry.id,
          message: res.error || 'Retry failed.',
          isError: true,
        });
      }
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Platform Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-slate-800">
          {(
            [
              { id: 'ALL', label: 'All Platforms' },
              { id: 'leetcode', label: 'LeetCode' },
              { id: 'gfg', label: 'GeeksforGeeks' },
              { id: 'hackerrank', label: 'HackerRank' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPlatformFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                platformFilter === tab.id
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Showing {platformScopedHistory.length} of {history.length} entries
        </span>
      </div>

      {/* Streak & Sync Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Streak &amp; Sync Analytics</CardTitle>
          <span className="text-[11px] text-slate-400 font-mono">
            Last 24 weeks ({analytics.totalSynced} total)
          </span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Flame className="w-3.5 h-3.5 text-orange-400" /> Current Streak
              </div>
              <div className="text-lg font-mono font-bold text-white mt-1">
                {analytics.currentStreak} day{analytics.currentStreak === 1 ? '' : 's'}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Trophy className="w-3.5 h-3.5 text-amber-400" /> Longest Streak
              </div>
              <div className="text-lg font-mono font-bold text-white mt-1">
                {analytics.longestStreak} day{analytics.longestStreak === 1 ? '' : 's'}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Solved Today
              </div>
              <div className="text-lg font-mono font-bold text-white mt-1">
                {analytics.todayCount}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[11px] text-slate-400">Platform Breakdown</div>
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold mt-1.5">
                <span className="text-amber-300">LC {analytics.platformBreakdown.leetcode}</span>
                <span className="text-slate-600">/</span>
                <span className="text-emerald-400">GFG {analytics.platformBreakdown.gfg}</span>
                <span className="text-slate-600">/</span>
                <span className="text-sky-400">HR {analytics.platformBreakdown.hackerrank}</span>
              </div>
              {totalPlatformSolves > 0 && (
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden flex">
                  <div className="bg-amber-400 h-full" style={{ width: `${lcPct}%` }} />
                  <div className="bg-emerald-500 h-full" style={{ width: `${gfgPct}%` }} />
                  <div className="bg-sky-400 h-full" style={{ width: `${hrPct}%` }} />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Daily Activity Heatmap (24 weeks)</span>
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <span>Less</span>
                {([0, 1, 2, 3, 4] as const).map((lvl) => (
                  <span
                    key={lvl}
                    className={`w-2.5 h-2.5 rounded-[2px] border ${HEATMAP_COLORS[lvl]}`}
                  />
                ))}
                <span>More</span>
              </div>
            </div>
            <div className="rounded-lg bg-slate-950/50 border border-slate-800/80 p-3 overflow-x-auto">
              <div className="inline-flex items-start gap-2">
                <div className="grid grid-rows-7 gap-1 text-[9px] text-slate-500 pr-1 pt-0.5 select-none">
                  <span className="h-3 leading-3" />
                  <span className="h-3 leading-3">Mon</span>
                  <span className="h-3 leading-3" />
                  <span className="h-3 leading-3">Wed</span>
                  <span className="h-3 leading-3" />
                  <span className="h-3 leading-3">Fri</span>
                  <span className="h-3 leading-3" />
                </div>
                <div className="flex gap-1">
                  {weeks.map((week, wIdx) => (
                    <div key={wIdx} className="grid grid-rows-7 gap-1">
                      {week.map((day, dIdx) =>
                        day ? (
                          <div
                            key={day.date}
                            title={`${day.date}: ${day.count} ${day.count === 1 ? 'solution' : 'solutions'}`}
                            className={`w-3 h-3 rounded-[2px] border transition-transform hover:scale-125 ${HEATMAP_COLORS[day.level]}`}
                          />
                        ) : (
                          <div key={`pad-${wIdx}-${dIdx}`} className="w-3 h-3" />
                        ),
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Synchronization Audit Log</CardTitle>
          {history.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="gap-1.5 text-xs"
              >
                <Download className="w-3.5 h-3.5" /> Export JSON
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (confirm('Clear all local sync history logs?')) {
                    await onClearHistory();
                  }
                }}
                className="gap-1.5 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear History
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {retryFeedback && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                retryFeedback.isError
                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}
            >
              {retryFeedback.isError ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span>{retryFeedback.message}</span>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-2" />
              <Input
                placeholder="Search problem, ID, or language..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              {(['ALL', 'SUCCESS', 'FAILED', 'SKIPPED'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilter(mode)}
                  className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    filter === mode
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
              <p className="text-xs">No synchronization logs matching your filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Problem</th>
                    <th className="py-2.5 px-3">Language</th>
                    <th className="py-2.5 px-3">Benchmarks</th>
                    <th className="py-2.5 px-3">Repository</th>
                    <th className="py-2.5 px-3">Commit</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap align-top">
                        {item.status === 'SUCCESS' ? (
                          <Badge variant="success">
                            <CheckCircle2 className="w-3 h-3" /> Synced
                          </Badge>
                        ) : item.status === 'SKIPPED' ? (
                          <Badge variant="secondary">Duplicate</Badge>
                        ) : (
                          <div className="space-y-1">
                            <Badge variant="destructive" title={item.error || 'Sync failed'}>
                              <AlertCircle className="w-3 h-3" /> Failed
                            </Badge>
                            {item.error && (
                              <p className="text-[10px] text-red-400/90 max-w-[180px] whitespace-normal leading-tight">
                                {item.error}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap align-top">
                        <span
                          className={`inline-block text-[10px] font-mono px-1.5 py-0.5 rounded border mr-2 ${
                            (item.platform || 'leetcode') === 'gfg'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : (item.platform || 'leetcode') === 'hackerrank'
                                ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          }`}
                        >
                          {(item.platform || 'leetcode') === 'gfg'
                            ? 'GFG'
                            : (item.platform || 'leetcode') === 'hackerrank'
                              ? 'HR'
                              : 'LC'}
                        </span>
                        <span className="font-mono text-slate-500 mr-1.5">
                          #{item.questionFrontendId}
                        </span>
                        <span className="font-medium text-slate-200">{item.questionTitle}</span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-400 align-top">
                        {item.lang}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap align-top">
                        {item.runtimeDisplay || item.memoryDisplay ? (
                          <div className="flex flex-col gap-0.5 font-mono text-[10px]">
                            {item.runtimeDisplay && (
                              <span className="text-emerald-400">{item.runtimeDisplay}</span>
                            )}
                            {item.memoryDisplay && (
                              <span className="text-sky-400">{item.memoryDisplay}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-400 align-top">
                        {item.repo}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap align-top">
                        {item.commitSha ? (
                          <a
                            href={item.commitUrl || `https://github.com/${item.repo}/commit/${item.commitSha}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-orange-400 hover:underline"
                          >
                            <GitCommit className="w-3 h-3" />
                            {item.commitSha.slice(0, 7)}
                          </a>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 text-[11px] align-top">
                        {new Date(item.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-right align-top">
                        <div className="flex items-center justify-end gap-1">
                          {item.status === 'FAILED' && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={retryingId === item.id}
                              title="Retry synchronization"
                              onClick={() => handleRetryClick(item)}
                            >
                              {retryingId === item.id ? (
                                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                              )}
                            </Button>
                          )}
                          <a
                            href={getProblemUrl(item.questionSlug, item.platform || 'leetcode', item.problemUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded text-slate-400 hover:text-slate-200"
                            title="View Problem"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
