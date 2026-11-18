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
} from 'lucide-react';
import type { SyncHistoryEntry } from '@leetsync/shared';

interface HistoryTabProps {
  history: SyncHistoryEntry[];
  onClearHistory: () => Promise<void>;
  onRetrySync: (entry: SyncHistoryEntry) => void;
}

export function HistoryTab({ history, onClearHistory, onRetrySync }: HistoryTabProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED' | 'SKIPPED'>('ALL');

  const filtered = history.filter((item) => {
    const matchesSearch =
      item.questionTitle.toLowerCase().includes(search.toLowerCase()) ||
      item.questionFrontendId.includes(search) ||
      item.lang.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === 'ALL' || item.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Synchronization Audit Log</CardTitle>
          {history.length > 0 && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={async () => {
                if (confirm('Clear all local sync history logs?')) {
                  await onClearHistory();
                }
              }}
              className="gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear History
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
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
                    <th className="py-2.5 px-3">Repository</th>
                    <th className="py-2.5 px-3">Commit</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {item.status === 'SUCCESS' ? (
                          <Badge variant="success">
                            <CheckCircle2 className="w-3 h-3" /> Synced
                          </Badge>
                        ) : item.status === 'SKIPPED' ? (
                          <Badge variant="secondary">Duplicate</Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertCircle className="w-3 h-3" /> Failed
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-mono text-slate-500 mr-1.5">
                          #{item.questionFrontendId}
                        </span>
                        <span className="font-medium text-slate-200">{item.questionTitle}</span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-400">
                        {item.lang}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">
                        {item.repo}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {item.commitSha ? (
                          <a
                            href={`https://github.com/${item.repo}/commit/${item.commitSha}`}
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
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 text-[11px]">
                        {new Date(item.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {item.status === 'FAILED' && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Retry synchronization"
                              onClick={() => onRetrySync(item)}
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                            </Button>
                          )}
                          <a
                            href={`https://leetcode.com/problems/${item.questionSlug}/`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded text-slate-400 hover:text-slate-200"
                            title="View Problem on LeetCode"
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

