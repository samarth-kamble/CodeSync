import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { GithubIcon } from '../../components/icons/GithubIcon';
import { RepoPicker } from '../../components/ui/RepoPicker';
import { LogOut, AlertCircle } from 'lucide-react';
import type { AuthState, SelectedRepository } from '@leetsync/shared';
import {
  initiateGitHubOAuth,
  disconnectGitHubAccount,
} from '../../github/auth';

interface AccountTabProps {
  auth: AuthState;
  selectedRepo: SelectedRepository | null;
  onUpdateAuth: (auth: AuthState) => Promise<void>;
  onUpdateRepo: (repo: SelectedRepository | null) => Promise<void>;
}

export function AccountTab({ auth, selectedRepo, onUpdateAuth, onUpdateRepo }: AccountTabProps) {
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleOAuthConnect = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const newAuth = await initiateGitHubOAuth();
      await onUpdateAuth(newAuth);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setAuthError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect your GitHub account from CodeSync?')) {
      await disconnectGitHubAccount();
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
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Connect your GitHub account to allow CodeSync to synchronize your accepted
                solutions directly to your chosen repository.
              </p>

              <div>
                <Button
                  type="button"
                  className="bg-white text-slate-950 hover:bg-slate-200 hover:text-black font-medium"
                  disabled={isLoading}
                  onClick={handleOAuthConnect}
                >
                  <GithubIcon className="w-4 h-4 text-slate-950" />
                  {isLoading ? 'Connecting...' : 'Continue with GitHub'}
                </Button>
              </div>

              {authError && (
                <p className="text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                  {authError}
                </p>
              )}
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
                  <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    {auth.user?.login}
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                  </h4>
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
          {auth.isConnected && auth.token ? (
            <RepoPicker
              token={auth.token}
              selectedRepo={selectedRepo}
              onSelectRepo={async (repo) => {
                await onUpdateRepo(repo);
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 rounded-lg bg-slate-950/60 border border-slate-800 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-slate-500" />
              <div>
                <p className="text-sm font-medium text-slate-200">GitHub Connection Required</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Please connect your GitHub account above using Continue with GitHub to browse repositories and select a branch.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
