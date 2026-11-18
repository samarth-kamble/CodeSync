import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ShieldCheck, HardDrive, Trash2 } from 'lucide-react';

interface AboutTabProps {
  onResetAllData: () => Promise<void>;
}

export function AboutTab({ onResetAllData }: AboutTabProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>About CodeSync</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-slate-400">
          <p>
            <strong className="text-slate-200">CodeSync v0.1.0</strong> is an automated developer
            productivity tool designed to keep your coding practice version-controlled, organized,
            and readily accessible in your personal GitHub repository.
          </p>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="font-medium text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Strict Accepted-Only Policy
            </h4>
            <p className="text-[11px] text-slate-400">
              CodeSync strictly requires a confirmed <code className="text-emerald-400">Accepted</code> verdict
              before any commit is prepared. Unsuccessful attempts, compilation errors, and timeouts
              are never committed to GitHub.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permissions Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-slate-400">
          <ul className="list-disc list-inside space-y-1 text-slate-300">
            <li>
              <code className="text-orange-400">storage</code>: Safely stores your preferences and sync history locally in your browser.
            </li>
            <li>
              <code className="text-orange-400">notifications</code>: Alerts you when a solution has been successfully committed to GitHub.
            </li>
            <li>
              <code className="text-orange-400">identity</code>: Powers genuine GitHub OAuth authorization.
            </li>
            <li>
              <code className="text-orange-400">leetcode.com</code>: Detects completed submissions on problem pages.
            </li>
            <li>
              <code className="text-orange-400">api.github.com</code>: Pushes commits directly to your selected repository.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-red-500/20 bg-red-950/10">
        <CardHeader>
          <CardTitle className="text-red-400">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-400">
            Reset all extension settings, unlink your repository, and clear local synchronization history.
            This action cannot be undone.
          </p>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={async () => {
              if (
                confirm(
                  'Are you absolutely sure? This will remove your repository selection, preferences, and local history.',
                )
              ) {
                await onResetAllData();
                alert('All CodeSync local data has been reset.');
              }
            }}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" /> Reset All Extension Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

