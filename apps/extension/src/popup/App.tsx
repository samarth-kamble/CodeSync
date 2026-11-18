import { useState } from 'react';
import { GitBranch, RefreshCw, CheckCircle2, Settings, Code2 } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@leetsync/shared';
import { GithubIcon } from '../components/icons/GithubIcon';

export default function App() {
  const [isConnected] = useState<boolean>(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true);

  const supportedLanguageCount = Object.keys(SUPPORTED_LANGUAGES).length;

  return (
    <div className="flex flex-col min-h-[480px] bg-slate-950 text-slate-100 p-4 select-none">
      {/* Header */}
      <header className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-white flex items-center gap-1.5">
              LeetSync
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono border border-slate-700">
                v0.1.0
              </span>
            </h1>
            <p className="text-xs text-slate-400">LeetCode to GitHub</p>
          </div>
        </div>

        <button
          type="button"
          aria-label="Settings"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-md transition-colors"
          onClick={() => {
            if (chrome?.runtime?.openOptionsPage) {
              chrome.runtime.openOptionsPage();
            }
          }}
        >
          <Settings className="w-4 h-4" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-4 space-y-3.5">
        {/* GitHub Account Status */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              GitHub Account
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                isConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}
              />
              {isConnected ? 'Connected' : 'Not Connected'}
            </span>
          </div>

          {!isConnected ? (
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white text-slate-950 font-medium text-xs hover:bg-slate-200 transition-colors shadow-sm"
            >
              <GithubIcon className="w-4 h-4" />
              Continue with GitHub
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                <GithubIcon className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-medium text-slate-200">octocat</p>
                <p className="text-slate-400 text-[11px]">Authorized</p>
              </div>
            </div>
          )}
        </section>

        {/* Repository & Sync Configuration */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Target Repository
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Auto-Sync</span>
              <button
                type="button"
                onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                className={`w-8 h-4 rounded-full transition-colors relative p-0.5 ${
                  autoSyncEnabled ? 'bg-orange-500' : 'bg-slate-800'
                }`}
                aria-label="Toggle auto sync"
              >
                <div
                  className={`w-3 h-3 rounded-full bg-white transition-transform ${
                    autoSyncEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2 text-slate-300">
              <GitBranch className="w-3.5 h-3.5 text-orange-400" />
              <span className="font-mono text-[11px]">No repo selected</span>
            </div>
            <span className="text-[10px] text-slate-500">Configure</span>
          </div>
        </section>

        {/* Sync Status / Activity Summary */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Supported Languages</span>
            <span className="font-mono text-slate-200">{supportedLanguageCount} langs</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Accepted Only Policy</span>
            <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Enforced
            </span>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <RefreshCw className="w-3 h-3 text-slate-500" /> Background sync ready
        </span>
        <span className="hover:text-slate-400 transition-colors cursor-pointer">Docs & Help</span>
      </footer>
    </div>
  );
}
