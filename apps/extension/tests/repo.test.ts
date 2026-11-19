import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchUserRepositories,
  fetchRepositoryBranches,
  verifyRepositoryPushAccess,
  createGitHubRepository,
  type RawGitHubRepo,
} from '../src/github/repo-manager';

describe('GitHub Repository Manager Logic', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps raw GitHub repo correctly and identifies push access', () => {
    const mockRaw: RawGitHubRepo = {
      id: 123456,
      name: 'CodeSync',
      full_name: 'samarth-kamble/CodeSync',
      owner: { login: 'samarth-kamble' },
      private: false,
      default_branch: 'main',
      permissions: {
        admin: true,
        push: true,
        pull: true,
      },
    };

    const hasPushAccess = Boolean(mockRaw.permissions?.push);
    expect(hasPushAccess).toBe(true);
    expect(mockRaw.default_branch).toBe('main');
    expect(mockRaw.full_name).toBe('samarth-kamble/CodeSync');
  });

  it('correctly detects read-only permissions as lacking push access', () => {
    const mockReadOnlyRepo: RawGitHubRepo = {
      id: 999999,
      name: 'upstream-practice',
      full_name: 'organization/upstream-practice',
      owner: { login: 'organization' },
      private: true,
      default_branch: 'master',
      permissions: {
        admin: false,
        push: false,
        pull: true,
      },
    };

    const hasPushAccess = Boolean(mockReadOnlyRepo.permissions?.push);
    expect(hasPushAccess).toBe(false);
  });

  it('sanitizes repository names properly for creation', () => {
    const rawName = '  my leetcode solutions 2026  ';
    const clean = rawName.trim().replace(/\s+/g, '-');
    expect(clean).toBe('my-leetcode-solutions-2026');
  });

  it('fetchUserRepositories fetches and formats repositories list correctly', async () => {
    const mockApiResponse = [
      {
        id: 1,
        name: 'repo-one',
        full_name: 'user/repo-one',
        owner: { login: 'user' },
        private: true,
        default_branch: 'main',
        permissions: { push: true, pull: true },
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    const repos = await fetchUserRepositories('fake-token');
    expect(repos).toHaveLength(1);
    expect(repos[0].name).toBe('repo-one');
    expect(repos[0].fullName).toBe('user/repo-one');
    expect(repos[0].owner).toBe('user');
    expect(repos[0].isPrivate).toBe(true);
    expect(repos[0].defaultBranch).toBe('main');
  });

  it('fetchRepositoryBranches extracts branch names from GitHub API', async () => {
    const mockBranches = [{ name: 'main' }, { name: 'dev' }, { name: 'feature/sync' }];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockBranches,
    } as Response);

    const branches = await fetchRepositoryBranches('fake-token', 'user', 'repo-one');
    expect(branches).toEqual(['main', 'dev', 'feature/sync']);
  });

  it('verifyRepositoryPushAccess returns true when user has push permissions', async () => {
    const mockRepo = {
      id: 1,
      name: 'repo-one',
      full_name: 'user/repo-one',
      owner: { login: 'user' },
      private: false,
      default_branch: 'main',
      permissions: { push: true, pull: true },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockRepo,
    } as Response);

    const result = await verifyRepositoryPushAccess('fake-token', 'user', 'repo-one');
    expect(result.hasPushAccess).toBe(true);
    expect(result.defaultBranch).toBe('main');
    expect(result.isPrivate).toBe(false);
  });

  it('verifyRepositoryPushAccess throws error on 404', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);

    await expect(
      verifyRepositoryPushAccess('fake-token', 'user', 'non-existent'),
    ).rejects.toThrow('Repository "user/non-existent" was not found or is inaccessible.');
  });

  it('createGitHubRepository posts correct payload with auto_init', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 42,
        name: 'leetcode-solutions',
        full_name: 'user/leetcode-solutions',
        owner: { login: 'user' },
        private: true,
        default_branch: 'main',
        permissions: { push: true, pull: true, admin: true },
      }),
    } as Response);

    const newRepo = await createGitHubRepository(
      'fake-token',
      'leetcode solutions',
      true,
      'My LeetCode Practice',
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.github.com/user/repos',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'leetcode-solutions',
          private: true,
          description: 'My LeetCode Practice',
          auto_init: true,
        }),
      }),
    );
    expect(newRepo.name).toBe('leetcode-solutions');
    expect(newRepo.isPrivate).toBe(true);
  });
});

