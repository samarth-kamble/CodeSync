import { Settings, RefreshCw } from 'lucide-react';
import { CodeSyncLogo } from '../components/icons/CodeSyncLogo';
import { useStorage } from '../storage';
import { Button } from '../components/ui/Button';
import { AccountStatusCard } from './components/AccountStatusCard';
import { RepoStatusCard } from './components/RepoStatusCard';
import { StatsCard } from './components/StatsCard';
import { RecentSubmissionsList } from './components/RecentSubmissionsList';
import { initiateGitHubOAuth, disconnectGitHubAccount } from '../github/auth';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

function PopupContent() {
  const [auth] = useStorage('auth');
  const [selectedRepo] = useStorage('selectedRepo');
  const [preferences, setPreferences] = useStorage('preferences');
  const [syncHistory] = useStorage('syncHistory');
  const [retryQueue] = useStorage('retryQueue');

  const openSettings = (_tab?: string) => {
    if (chrome?.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome?.runtime?.getURL?.('options.html') || 'options.html', '_blank');
    }
  };

  const handleConnect = async () => {
    try {
      await initiateGitHubOAuth();
    } catch (err: unknown) {
      console.warn('[CodeSync] OAuth initiation note:', err);
      // Open settings page so user can see detailed auth options or paste token
      openSettings('account');
    }
  };

  const handleDisconnect = async () => {
    await disconnectGitHubAccount();
  };

  const handleToggleAutoSync = async (checked: boolean) => {
    await setPreferences((prev) => ({
      ...prev,
      autoSync: checked,
    }));
  };

  const handleFlushRetryQueue = () => {
    if (typeof chrome !== 'undefined' && chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'CODESYNC_FLUSH_RETRY_QUEUE' });
    }
  };

  return (
    <div className="flex flex-col min-h-[490px] bg-slate-950 text-slate-100 p-4 select-none">
      {/* Header */}
      <header className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <CodeSyncLogo className="w-6 h-3.5" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-white flex items-center gap-1.5">
              CodeSync
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono border border-slate-700">
                v0.1.0
              </span>
            </h1>
            <p className="text-xs text-slate-400">LeetCode to GitHub</p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Settings"
          title="Open Settings"
          onClick={() => openSettings()}
        >
          <Settings className="w-4 h-4 text-slate-400" />
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-3.5 space-y-3">
        {/* GitHub Account Status */}
        <AccountStatusCard
          auth={auth}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />

        {/* Repository & Branch Configuration */}
        <RepoStatusCard
          selectedRepo={selectedRepo}
          autoSync={preferences.autoSync}
          onToggleAutoSync={handleToggleAutoSync}
          onOpenSettings={() => openSettings('account')}
        />

        {/* Statistics & Gate Status */}
        <StatsCard syncHistory={syncHistory} />

        {retryQueue.length > 0 && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-sky-500/30 bg-sky-500/10 text-xs">
            <span className="text-sky-200 text-[11px]">
              {retryQueue.length} solution{retryQueue.length === 1 ? '' : 's'} queued for retry
            </span>
            <button
              type="button"
              onClick={handleFlushRetryQueue}
              className="text-[11px] font-medium text-sky-300 hover:text-white underline cursor-pointer"
            >
              Retry now
            </button>
          </div>
        )}

        {/* Recent Submissions Feed */}
        <RecentSubmissionsList
          history={syncHistory}
          onOpenSettings={() => openSettings('history')}
        />
      </main>

      {/* Footer */}
      <footer className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <RefreshCw className="w-3 h-3 text-slate-500" />
          {preferences.autoSync ? 'Auto-sync active' : 'Auto-sync paused'}
        </span>
        <button
          type="button"
          onClick={() => openSettings('about')}
          className="hover:text-slate-300 transition-colors cursor-pointer"
        >
          Docs & Preferences
        </button>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="CodeSync Popup Error">
      <PopupContent />
    </ErrorBoundary>
  );
}
