import { useState } from 'react';
import { useStorage, STORAGE_DEFAULTS } from '../storage';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { AccountTab } from './tabs/AccountTab';
import { PreferencesTab } from './tabs/PreferencesTab';
import { HistoryTab } from './tabs/HistoryTab';
import { AboutTab } from './tabs/AboutTab';
import { GithubIcon } from '../components/icons/GithubIcon';
import { Code2, Sliders, History, Info } from 'lucide-react';
import type { SyncHistoryEntry } from '@leetsync/shared';

export default function SettingsApp() {
  const [auth, setAuth] = useStorage('auth');
  const [selectedRepo, setSelectedRepo] = useStorage('selectedRepo');
  const [preferences, setPreferences] = useStorage('preferences');
  const [syncHistory, setSyncHistory] = useStorage('syncHistory');

  const [activeTab, setActiveTab] = useState('account');

  const handleClearHistory = async () => {
    await setSyncHistory([]);
  };

  const handleRetrySync = async (entry: SyncHistoryEntry): Promise<{ status: string; error?: string }> => {
    if (typeof chrome !== 'undefined' && chrome?.runtime?.sendMessage) {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'CODESYNC_RETRY_SYNC', payload: { entryId: entry.id } },
          (response: { status?: string; error?: string } | undefined) => {
            if (chrome.runtime.lastError) {
              resolve({ status: 'FAILED', error: chrome.runtime.lastError.message });
            } else {
              resolve({
                status: response?.status || 'FAILED',
                error: response?.error,
              });
            }
          },
        );
      });
    }
    return { status: 'FAILED', error: 'Extension runtime unavailable.' };
  };

  const handleResetAllData = async () => {
    await setAuth(STORAGE_DEFAULTS.auth);
    await setSelectedRepo(STORAGE_DEFAULTS.selectedRepo);
    await setPreferences(STORAGE_DEFAULTS.preferences);
    await setSyncHistory(STORAGE_DEFAULTS.syncHistory);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/60 sticky top-0 z-10 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
                CodeSync
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono border border-slate-700">
                  Settings & History
                </span>
              </h1>
            </div>
          </div>

          <a
            href="https://github.com/samarth-kamble/CodeSync"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5"
          >
            <span>GitHub Repository</span>
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-900/80 border border-slate-800 p-1 rounded-xl">
            <TabsTrigger value="account" className="gap-2">
              <GithubIcon className="w-3.5 h-3.5" />
              <span>Account & Repository</span>
            </TabsTrigger>

            <TabsTrigger value="preferences" className="gap-2">
              <Sliders className="w-3.5 h-3.5" />
              <span>Sync Preferences</span>
            </TabsTrigger>

            <TabsTrigger value="history" className="gap-2">
              <History className="w-3.5 h-3.5" />
              <span>History Log ({syncHistory.length})</span>
            </TabsTrigger>

            <TabsTrigger value="about" className="gap-2">
              <Info className="w-3.5 h-3.5" />
              <span>About & Help</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account">
            <AccountTab
              auth={auth}
              selectedRepo={selectedRepo}
              onUpdateAuth={setAuth}
              onUpdateRepo={setSelectedRepo}
            />
          </TabsContent>

          <TabsContent value="preferences">
            <PreferencesTab
              preferences={preferences}
              onUpdatePreferences={setPreferences}
            />
          </TabsContent>

          <TabsContent value="history">
            <HistoryTab
              history={syncHistory}
              onClearHistory={handleClearHistory}
              onRetrySync={handleRetrySync}
            />
          </TabsContent>

          <TabsContent value="about">
            <AboutTab onResetAllData={handleResetAllData} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
