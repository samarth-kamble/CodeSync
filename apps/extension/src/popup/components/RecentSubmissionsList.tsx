import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { GitCommit, ExternalLink, AlertCircle } from 'lucide-react';
import type { SyncHistoryEntry } from '@leetsync/shared';

interface RecentSubmissionsListProps {
  history: SyncHistoryEntry[];
  onOpenSettings: () => void;
}

export function RecentSubmissionsList({ history, onOpenSettings }: RecentSubmissionsListProps) {
  const recent = history.slice(0, 3);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-medium text-slate-400">
        <span className="uppercase tracking-wider">Recent Activity</span>
        {history.length > 0 && (
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={onOpenSettings}
            className="text-[11px] text-slate-400 hover:text-orange-400"
          >
            View all ({history.length})
          </Button>
        )}
      </div>

      {recent.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-4 text-center">
          <p className="text-xs text-slate-400">No submissions synced yet.</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Solve any problem on LeetCode with Accepted status to see it appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {recent.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 transition-colors text-xs"
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-slate-400 text-[11px]">
                    #{item.questionFrontendId}
                  </span>
                  <span className="font-medium text-slate-200 truncate">
                    {item.questionTitle}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                  <span className="font-mono text-slate-400">{item.lang}</span>
                  <span>•</span>
                  <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {item.status === 'SUCCESS' ? (
                  <Badge variant="success">Synced</Badge>
                ) : item.status === 'SKIPPED' ? (
                  <Badge variant="secondary">Duplicate</Badge>
                ) : (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Failed
                  </Badge>
                )}

                {item.commitSha && (
                  <a
                    href={`https://github.com/${item.repo}/commit/${item.commitSha}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    title={`View commit ${item.commitSha.slice(0, 7)}`}
                  >
                    <GitCommit className="w-3.5 h-3.5" />
                  </a>
                )}
                <a
                  href={`https://leetcode.com/problems/${item.questionSlug}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded text-slate-400 hover:text-orange-400 hover:bg-slate-800"
                  title="View problem on LeetCode"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

