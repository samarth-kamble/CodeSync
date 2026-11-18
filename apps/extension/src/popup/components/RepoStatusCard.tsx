import { GitBranch, FolderGit2, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Switch } from '../../components/ui/Switch';
import { Button } from '../../components/ui/Button';
import type { SelectedRepository } from '@leetsync/shared';

interface RepoStatusCardProps {
  selectedRepo: SelectedRepository | null;
  autoSync: boolean;
  onToggleAutoSync: (checked: boolean) => void;
  onOpenSettings: () => void;
}

export function RepoStatusCard({
  selectedRepo,
  autoSync,
  onToggleAutoSync,
  onOpenSettings,
}: RepoStatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Target Repository</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Auto-Sync</span>
          <Switch checked={autoSync} onCheckedChange={onToggleAutoSync} />
        </div>
      </CardHeader>

      <CardContent>
        {selectedRepo ? (
          <div className="flex items-center justify-between text-xs py-2 px-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <FolderGit2 className="w-4 h-4 text-orange-400 shrink-0" />
              <div className="min-w-0">
                <a
                  href={`https://github.com/${selectedRepo.fullName}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-slate-200 hover:text-orange-400 hover:underline truncate block"
                >
                  {selectedRepo.fullName}
                </a>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <GitBranch className="w-3 h-3 text-slate-500" />
                  <span>{selectedRepo.targetBranch || selectedRepo.defaultBranch}</span>
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Open repository in GitHub"
              onClick={() => {
                window.open(`https://github.com/${selectedRepo.fullName}`, '_blank');
              }}
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs py-2 px-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2 text-slate-400">
              <GitBranch className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-mono text-[11px]">No repository selected</span>
            </div>
            <Button
              type="button"
              variant="link"
              onClick={onOpenSettings}
              className="text-[11px] text-orange-400 hover:text-orange-300"
            >
              Configure
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

