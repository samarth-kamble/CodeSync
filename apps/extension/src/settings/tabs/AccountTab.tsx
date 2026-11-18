import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { GithubIcon } from '../../components/icons/GithubIcon';
import { GitBranch, FolderGit2, CheckCircle2, RefreshCw, LogOut } from 'lucide-react';
import type { AuthState, SelectedRepository } from '@leetsync/shared';

interface AccountTabProps {
  auth: AuthState;
  selectedRepo: SelectedRepository | null;
  onUpdateAuth: (auth: AuthState) => Promise<void>;
  onUpdateRepo: (repo: SelectedRepository | null) => Promise<void>;
}

export function AccountTab({ auth, selectedRepo, onUpdateAuth, onUpdateRepo }: AccountTabProps) {
  const [repoInput, setRepoInput] = useState(selectedRepo?.fullName || 'samarth-kamble/CodeSync');
  const [branchInput, setBranchInput] = useState(selectedRepo?.targetBranch || 'main');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveRepo = async () => {
    const parts = repoInput.trim().split('/');
    if (parts.length !== 2) {
      alert('Please enter repository in format "owner/repo"');
      return;
    }

    const [owner, name] = parts;
    const newRepo: SelectedRepository = {
      id: selectedRepo?.id || Date.now(),
      owner,
      name,
      fullName: repoInput.trim(),
      isPrivate: false,
      defaultBranch: branchInput.trim() || 'main',
      targetBranch: branchInput.trim() || 'main',
    };

    await onUpdateRepo(newRepo);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect your GitHub account from CodeSync?')) {
      await onUpdateAuth({
        isConnected: false,
        user: null,
        token: null,
        lastConnectedAt: null,
      });
      await onUpdateRepo(null);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Account Section */}
      <Card>
        <CardHeader>
          <CardTitle>GitHub Authentication</CardTitle>
          <Badge variant={auth.isConnected ? 'success' : 'warning'}>
            {auth.isConnected ? 'Connected' : 'Not Connected'}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {!auth.isConnected ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Connect your personal GitHub account to allow CodeSync to synchronize your accepted
                solutions directly to your chosen repository.
              </p>
              <Button
                type="button"
                className="bg-white text-slate-950 hover:bg-slate-200 hover:text-black font-medium"
                onClick={() => {
                  alert(
                    'GitHub OAuth will be connected via the backend bridge in Phase 4. For testing UI, mock connection can be toggled.',
                  );
                }}
              >
                <GithubIcon className="w-4 h-4 text-slate-950" />
                Continue with GitHub
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-3">
                {auth.user?.avatarUrl ? (
                  <img
                    src={auth.user.avatarUrl}
                    alt={auth.user.login}
                    className="w-10 h-10 rounded-full border border-slate-700"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                    <GithubIcon className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-slate-100">{auth.user?.login}</h4>
                  <p className="text-xs text-slate-500">
                    Connected {auth.lastConnectedAt ? new Date(auth.lastConnectedAt).toLocaleDateString() : 'recently'}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                className="gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" /> Disconnect
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Repository Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Target Repository & Branch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-400">
            Specify the GitHub repository and branch where problem folders (`0704-binary-search/`)
            and solutions will be committed.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Repository (`owner/repository-name`)
              </label>
              <div className="relative">
                <FolderGit2 className="w-4 h-4 text-slate-500 absolute left-2.5 top-2" />
                <Input
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  placeholder="e.g. username/leetcode-practice"
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Target Branch
              </label>
              <div className="relative">
                <GitBranch className="w-4 h-4 text-slate-500 absolute left-2.5 top-2" />
                <Input
                  value={branchInput}
                  onChange={(e) => setBranchInput(e.target.value)}
                  placeholder="e.g. main"
                  className="pl-8 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                onClick={handleSaveRepo}
                className="gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Save Repository Configuration
              </Button>

              {saveSuccess && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved successfully
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

