import { useState, useEffect } from 'react';
import {
  fetchUserRepositories,
  fetchRepositoryBranches,
  verifyRepositoryPushAccess,
} from '../../github/repo-manager';
import { CreateRepoDialog } from './CreateRepoDialog';
import { Input } from './Input';
import { Button } from './Button';
import { Badge } from './Badge';
import {
  FolderGit2,
  GitBranch,
  Lock,
  Globe,
  Search,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import type { GitHubRepository, SelectedRepository } from '@leetsync/shared';

interface RepoPickerProps {
  token: string;
  selectedRepo: SelectedRepository | null;
  onSelectRepo: (repo: SelectedRepository) => Promise<void>;
}

export function RepoPicker({ token, selectedRepo, onSelectRepo }: RepoPickerProps) {
  const [repos, setRepos] = useState<GitHubRepository[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>(selectedRepo?.targetBranch || 'main');
  const [search, setSearch] = useState('');
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeRepo, setActiveRepo] = useState<GitHubRepository | null>(
    selectedRepo
      ? {
          id: selectedRepo.id,
          name: selectedRepo.name,
          fullName: selectedRepo.fullName,
          owner: selectedRepo.owner,
          isPrivate: selectedRepo.isPrivate,
          defaultBranch: selectedRepo.defaultBranch,
        }
      : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadRepositories = async () => {
    setIsLoadingRepos(true);
    setError(null);
    try {
      const list = await fetchUserRepositories(token);
      setRepos(list);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch repositories from GitHub');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const loadBranches = async (owner: string, name: string, defaultBranch: string) => {
    setIsLoadingBranches(true);
    try {
      const branchList = await fetchRepositoryBranches(token, owner, name);
      setBranches(branchList);
      if (!branchList.includes(selectedBranch)) {
        setSelectedBranch(defaultBranch || branchList[0] || 'main');
      }
    } catch {
      setBranches([defaultBranch || 'main']);
    } finally {
      setIsLoadingBranches(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadRepositories();
    }
  }, [token]);

  useEffect(() => {
    if (activeRepo) {
      loadBranches(activeRepo.owner, activeRepo.name, activeRepo.defaultBranch);
    }
  }, [activeRepo]);

  const handleSelectRepository = async (repo: GitHubRepository) => {
    setError(null);
    setActiveRepo(repo);
    setSelectedBranch(repo.defaultBranch || 'main');
  };

  const handleSaveConfiguration = async () => {
    if (!activeRepo) return;
    setError(null);

    try {
      // Verify write access before saving
      const { hasPushAccess } = await verifyRepositoryPushAccess(
        token,
        activeRepo.owner,
        activeRepo.name,
      );

      if (!hasPushAccess) {
        setError(`You do not have write/push access to ${activeRepo.fullName}. Please select a repository you own or have collaborator access to.`);
        return;
      }

      const toSave: SelectedRepository = {
        id: activeRepo.id,
        name: activeRepo.name,
        fullName: activeRepo.fullName,
        owner: activeRepo.owner,
        isPrivate: activeRepo.isPrivate,
        defaultBranch: activeRepo.defaultBranch || 'main',
        targetBranch: selectedBranch || activeRepo.defaultBranch || 'main',
      };

      await onSelectRepo(toSave);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to verify repository permissions');
    }
  };

  const filteredRepos = repos.filter(
    (r) =>
      r.fullName.toLowerCase().includes(search.toLowerCase()) ||
      r.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2 justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-2" />
          <Input
            placeholder="Search your repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={loadRepositories}
            disabled={isLoadingRepos}
            className="gap-1 text-slate-400"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRepos ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            New Repository
          </Button>
        </div>
      </div>

      {/* Repository List Box */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2 max-h-56 overflow-y-auto space-y-1">
        {isLoadingRepos && repos.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-slate-400" />
            Loading your GitHub repositories...
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No repositories found matching "{search}".
          </div>
        ) : (
          filteredRepos.map((repo) => {
            const isSelected = activeRepo?.id === repo.id;
            return (
              <div
                key={repo.id}
                onClick={() => handleSelectRepository(repo)}
                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                  isSelected
                    ? 'border-orange-500/50 bg-orange-500/10 text-white'
                    : 'border-transparent hover:bg-slate-900/80 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {repo.isPrivate ? (
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className="font-medium truncate">{repo.fullName}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isSelected && (
                    <Badge variant="brand" className="text-[10px]">
                      Selected
                    </Badge>
                  )}
                  <a
                    href={`https://github.com/${repo.fullName}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded text-slate-500 hover:text-slate-200"
                    title="View on GitHub"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Active Selection Details & Branch Configuration */}
      {activeRepo && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                Target Repository
              </span>
              <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5 mt-0.5">
                <FolderGit2 className="w-4 h-4 text-orange-400" />
                {activeRepo.fullName}
              </h4>
            </div>

            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Push Permission Verified
            </Badge>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Synchronization Branch
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <GitBranch className="w-4 h-4 text-slate-500 absolute left-2.5 top-2" />
                {branches.length > 0 ? (
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                  >
                    {branches.map((b) => (
                      <option key={b} value={b}>
                        {b} {b === activeRepo.defaultBranch ? '(default)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    placeholder="main"
                    className="pl-8 font-mono text-xs"
                    disabled={isLoadingBranches}
                  />
                )}
              </div>

              <Button
                type="button"
                onClick={handleSaveConfiguration}
                className="gap-2 shrink-0 bg-white text-slate-950 hover:bg-slate-200"
              >
                <CheckCircle2 className="w-4 h-4" /> Save Target Repo
              </Button>
            </div>
          </div>

          {saveSuccess && (
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Repository and branch updated successfully!
            </p>
          )}

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </p>
          )}
        </div>
      )}

      {/* Modal for creating a repo */}
      <CreateRepoDialog
        token={token}
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onRepoCreated={(newRepo) => {
          setRepos((prev) => [newRepo, ...prev]);
          handleSelectRepository(newRepo);
        }}
      />
    </div>
  );
}

