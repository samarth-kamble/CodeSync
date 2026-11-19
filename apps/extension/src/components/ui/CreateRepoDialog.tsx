import { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Switch } from './Switch';
import { Lock, Globe, Plus, X } from 'lucide-react';
import { createGitHubRepository } from '../../github/repo-manager';
import type { GitHubRepository } from '@leetsync/shared';

interface CreateRepoDialogProps {
  token: string;
  isOpen: boolean;
  onClose: () => void;
  onRepoCreated: (repo: GitHubRepository) => void;
}

export function CreateRepoDialog({
  token,
  isOpen,
  onClose,
  onRepoCreated,
}: CreateRepoDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('LeetCode solutions synced via CodeSync');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const sanitizedName = name.trim().replace(/\s+/g, '-');

  const handleCreate = async () => {
    if (!sanitizedName) {
      setError('Please provide a repository name.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newRepo = await createGitHubRepository(token, sanitizedName, isPrivate, description);
      onRepoCreated(newRepo);
      setName('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create repository');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Plus className="w-4 h-4 text-orange-400" />
            <span>Create New GitHub Repository</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Repository Name</label>
            <Input
              placeholder="e.g. leetcode-practice"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="font-mono"
            />
            {name && (
              <p className="text-[11px] text-slate-400 mt-1">
                Will be created as: <code className="text-orange-400">{sanitizedName}</code>
              </p>
            )}
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Description (Optional)</label>
            <Input
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2">
              {isPrivate ? (
                <Lock className="w-4 h-4 text-amber-400" />
              ) : (
                <Globe className="w-4 h-4 text-slate-400" />
              )}
              <div>
                <span className="font-medium text-slate-200 block">
                  {isPrivate ? 'Private Repository' : 'Public Repository'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {isPrivate ? 'Only you can view this repository' : 'Visible to anyone on GitHub'}
                </span>
              </div>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
              {error}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCreate} disabled={isLoading}>
            {isLoading ? 'Creating on GitHub...' : 'Create & Select Repository'}
          </Button>
        </div>
      </div>
    </div>
  );
}

