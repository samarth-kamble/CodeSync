import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { Input } from '../../components/ui/Input';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import {
  type UserPreferences,
  type OverwritePolicy,
  type FolderOrganization,
  DEFAULT_PREFERENCES,
  formatCommitMessage,
} from '@leetsync/shared';

interface PreferencesTabProps {
  preferences: UserPreferences;
  onUpdatePreferences: (pref: UserPreferences) => Promise<void>;
}

export function PreferencesTab({ preferences, onUpdatePreferences }: PreferencesTabProps) {
  const [prefs, setPrefs] = useState<UserPreferences>(preferences);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    await onUpdatePreferences(prefs);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleReset = async () => {
    setPrefs(DEFAULT_PREFERENCES);
    await onUpdatePreferences(DEFAULT_PREFERENCES);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Synchronization Policies */}
      <Card>
        <CardHeader>
          <CardTitle>Synchronization Behavior</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h4 className="text-xs font-medium text-slate-200">Automatic Sync</h4>
              <p className="text-[11px] text-slate-400">
                Immediately trigger GitHub sync upon verifying an Accepted verdict.
              </p>
            </div>
            <Switch
              checked={prefs.autoSync}
              onCheckedChange={(checked) => setPrefs({ ...prefs, autoSync: checked })}
            />
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h4 className="text-xs font-medium text-slate-200">Desktop Notifications</h4>
              <p className="text-[11px] text-slate-400">
                Show system notifications when a submission is synced or fails to commit.
              </p>
            </div>
            <Switch
              checked={prefs.enableNotifications !== false}
              onCheckedChange={(checked) => setPrefs({ ...prefs, enableNotifications: checked })}
            />
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-medium text-slate-200">Resubmission Update Policy</h4>
            <p className="text-[11px] text-slate-400">
              Determines how LeetSync handles subsequent Accepted solutions for the same problem and
              language.
            </p>

            <div className="grid grid-cols-1 gap-2 pt-1">
              {[
                {
                  id: 'always',
                  title: 'Always Overwrite (Default)',
                  desc: 'Updates the solution file with the latest Accepted code.',
                },
                {
                  id: 'improved',
                  title: 'Overwrite Only if Performance Improved',
                  desc: 'Only updates if runtime or memory usage is strictly better than the previous sync.',
                },
                {
                  id: 'never',
                  title: 'Never Overwrite',
                  desc: 'Preserves the first accepted solution and ignores subsequent submissions.',
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                    prefs.overwritePolicy === opt.id
                      ? 'border-orange-500/50 bg-orange-500/5 text-slate-100'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="overwritePolicy"
                    value={opt.id}
                    checked={prefs.overwritePolicy === opt.id}
                    onChange={() =>
                      setPrefs({ ...prefs, overwritePolicy: opt.id as OverwritePolicy })
                    }
                    className="mt-0.5 accent-orange-500"
                  />
                  <div>
                    <span className="font-medium text-slate-200 block">{opt.title}</span>
                    <span className="text-[11px] text-slate-400">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commit Message & Folder Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Folder & Commit Formatting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Folder Organization
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {[
                {
                  id: 'flat',
                  title: 'Flat (Default)',
                  example: '0704-binary-search/',
                },
                {
                  id: 'topic',
                  title: 'By Topic (SQL, DP, Linked List...)',
                  example: 'sql/0175-combine-two-tables/',
                },
                {
                  id: 'difficulty',
                  title: 'By Difficulty',
                  example: 'easy/0704-binary-search/',
                },
                {
                  id: 'language',
                  title: 'By Language',
                  example: 'python3/0704-binary-search/',
                },
              ].map((mode) => {
                const current = prefs.folderOrganization || 'flat';
                return (
                  <label
                    key={mode.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      current === mode.id
                        ? 'border-orange-500/50 bg-orange-500/5 text-slate-100'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="folderOrganization"
                      value={mode.id}
                      checked={current === mode.id}
                      onChange={() =>
                        setPrefs({ ...prefs, folderOrganization: mode.id as FolderOrganization })
                      }
                      className="mt-0.5 accent-orange-500"
                    />
                    <div className="min-w-0">
                      <span className="font-medium text-slate-200 block">{mode.title}</span>
                      <code className="text-[10px] text-orange-400 block truncate mt-0.5">
                        {mode.example}
                      </code>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Folder Naming Format
            </label>
            <Input
              value={prefs.folderNamingFormat}
              disabled
              className="font-mono text-slate-400 bg-slate-900 cursor-not-allowed"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Standard format: <code className="text-orange-400">0704-binary-search/</code>
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Commit Message Template
            </label>
            <Input
              value={prefs.commitMessageFormat}
              onChange={(e) => setPrefs({ ...prefs, commitMessageFormat: e.target.value })}
              className="font-mono text-xs"
            />
            <div className="mt-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] space-y-1">
              <span className="text-slate-500 block uppercase tracking-wider text-[10px]">
                Live Preview:
              </span>
              <p className="font-mono text-emerald-400">
                {formatCommitMessage(prefs.commitMessageFormat, {
                  submissionId: 'preview',
                  questionId: '704',
                  questionFrontendId: '704',
                  questionTitle: 'Binary Search',
                  questionSlug: 'binary-search',
                  status: 'Accepted',
                  lang: 'cpp',
                  code: '',
                  timestamp: 0,
                  stats: {
                    runtimeMs: 2,
                    runtimeDisplay: '2 ms',
                    runtimePercentile: 98.21,
                    memoryBytes: 50121932,
                    memoryDisplay: '47.8 MB',
                    memoryPercentile: 78.01,
                  },
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button type="button" onClick={handleSave} className="gap-2">
              <CheckCircle2 className="w-4 h-4" /> Save Preferences
            </Button>

            <div className="flex items-center gap-3">
              {saveSuccess && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Preferences Saved
                </span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="gap-1.5 text-slate-500 hover:text-slate-300"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
