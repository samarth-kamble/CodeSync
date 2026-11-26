import type { GitHubRepository } from '@leetsync/shared';

const GITHUB_API_BASE = 'https://api.github.com';

function getAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'CodeSync-Extension',
  };
}

export interface RawGitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  private: boolean;
  default_branch: string;
  permissions?: {
    admin?: boolean;
    push?: boolean;
    pull?: boolean;
  };
  description?: string | null;
  stargazers_count?: number;
  updated_at?: string;
}

/**
 * Fetches all repositories the authenticated user has access to.
 */
export async function fetchUserRepositories(
  token: string,
  visibility: 'all' | 'public' | 'private' = 'all',
): Promise<GitHubRepository[]> {
  const url = `${GITHUB_API_BASE}/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator&visibility=${visibility}`;

  const response = await fetch(url, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch repositories: ${response.status} ${response.statusText}`);
  }

  const data: RawGitHubRepo[] = await response.json();

  return data.map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner.login,
    isPrivate: repo.private,
    defaultBranch: repo.default_branch || 'main',
    permissions: repo.permissions,
  }));
}

/**
 * Fetches all branches for a given repository.
 */
export async function fetchRepositoryBranches(
  token: string,
  owner: string,
  repo: string,
): Promise<string[]> {
  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=100`;

  const response = await fetch(url, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch branches: ${response.status} ${response.statusText}`);
  }

  const branches: Array<{ name: string }> = await response.json();
  return branches.map((b) => b.name);
}

/**
 * Fetches all folder (tree) paths in a repository branch recursively.
 * Returns [] if the repository or branch is empty (404/409).
 */
export async function fetchRepositoryFolders(
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<string[]> {
  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`;

  const response = await fetch(url, {
    headers: getAuthHeaders(token),
  });

  if (response.status === 404 || response.status === 409) {
    return [];
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch repository folders: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    tree?: Array<{ path?: string; type?: string }>;
  };

  if (!Array.isArray(data.tree)) {
    return [];
  }

  return data.tree
    .filter((item) => item.type === 'tree' && Boolean(item.path))
    .map((item) => item.path as string)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Strictly verifies whether the authenticated user has push/write access to the repository.
 */
export async function verifyRepositoryPushAccess(
  token: string,
  owner: string,
  repo: string,
): Promise<{ hasPushAccess: boolean; defaultBranch: string; isPrivate: boolean }> {
  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

  const response = await fetch(url, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Repository "${owner}/${repo}" was not found or is inaccessible.`);
    }
    throw new Error(`Verification failed: ${response.status} ${response.statusText}`);
  }

  const data: RawGitHubRepo = await response.json();
  const hasPushAccess = Boolean(data.permissions?.push);

  return {
    hasPushAccess,
    defaultBranch: data.default_branch || 'main',
    isPrivate: data.private,
  };
}

/**
 * Creates a brand new repository under the authenticated user's account.
 */
export async function createGitHubRepository(
  token: string,
  name: string,
  isPrivate: boolean = false,
  description: string = 'LeetCode solutions automatically synced via CodeSync',
): Promise<GitHubRepository> {
  const cleanName = name.trim().replace(/\s+/g, '-');
  if (!cleanName) {
    throw new Error('Repository name cannot be empty');
  }

  const response = await fetch(`${GITHUB_API_BASE}/user/repos`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: cleanName,
      private: isPrivate,
      description,
      auto_init: true, // creates an initial commit with README.md so the branch exists immediately
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to create repository: ${response.status}`);
  }

  const repo: RawGitHubRepo = await response.json();

  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner.login,
    isPrivate: repo.private,
    defaultBranch: repo.default_branch || 'main',
    permissions: repo.permissions || { push: true, pull: true, admin: true },
  };
}

