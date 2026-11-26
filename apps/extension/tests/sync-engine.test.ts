import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  evaluateOverwritePolicy,
  executeAtomicCommit,
  syncSubmissionToGitHub,
} from '../src/github/sync-engine';
import type {
  SubmissionData,
  ProblemMetadata,
  SelectedRepository,
  UserPreferences,
  SyncHistoryEntry,
} from '@leetsync/shared';

describe('Sync Engine - Overwrite & Deduplication Policies', () => {
  const baseSubmission: SubmissionData = {
    submissionId: 'sub_123',
    questionId: '704',
    questionFrontendId: '704',
    questionTitle: 'Binary Search',
    questionSlug: 'binary-search',
    status: 'Accepted',
    lang: 'python3',
    code: 'class Solution: pass',
    timestamp: 1716120000000,
    stats: {
      runtimeMs: 40,
      runtimeDisplay: '40 ms',
      runtimePercentile: 90,
      memoryBytes: 15000000,
      memoryDisplay: '15 MB',
      memoryPercentile: 80,
    },
  };

  const defaultPreferences: UserPreferences = {
    autoSync: true,
    overwritePolicy: 'always',
    commitMessageFormat: 'solve {title}',
    folderNamingFormat: '{zero-padded-id}-{slug}',
  };

  it('deduplicates submission by exact submissionId', () => {
    const existingHistory: SyncHistoryEntry[] = [
      {
        id: 'h1',
        submissionId: 'sub_123',
        questionFrontendId: '704',
        questionTitle: 'Binary Search',
        questionSlug: 'binary-search',
        lang: 'python3',
        repo: 'user/repo',
        branch: 'main',
        folderPath: '0704-binary-search',
        solutionFilePath: '0704-binary-search/binary-search.py',
        readmeFilePath: '0704-binary-search/README.md',
        status: 'SUCCESS',
        timestamp: Date.now(),
      },
    ];

    const result = evaluateOverwritePolicy(baseSubmission, defaultPreferences, existingHistory);
    expect(result.shouldSync).toBe(false);
    expect(result.reason).toContain('already been synchronized');
  });

  it('allows synchronization if problem was never synced before', () => {
    const result = evaluateOverwritePolicy(baseSubmission, defaultPreferences, []);
    expect(result.shouldSync).toBe(true);
  });

  it('respects overwritePolicy="never" and skips if problem already exists', () => {
    const prefs: UserPreferences = {
      ...defaultPreferences,
      overwritePolicy: 'never',
    };

    const existingHistory: SyncHistoryEntry[] = [
      {
        id: 'h1',
        submissionId: 'sub_earlier',
        questionFrontendId: '704',
        questionTitle: 'Binary Search',
        questionSlug: 'binary-search',
        lang: 'python3',
        repo: 'user/repo',
        branch: 'main',
        folderPath: '0704-binary-search',
        solutionFilePath: '0704-binary-search/binary-search.py',
        readmeFilePath: '0704-binary-search/README.md',
        status: 'SUCCESS',
        timestamp: Date.now() - 10000,
      },
    ];

    const result = evaluateOverwritePolicy(baseSubmission, prefs, existingHistory);
    expect(result.shouldSync).toBe(false);
    expect(result.reason).toContain('overwrite policy is set to \'never\'');
  });

  it('respects overwritePolicy="always" and proceeds even if problem exists', () => {
    const prefs: UserPreferences = {
      ...defaultPreferences,
      overwritePolicy: 'always',
    };

    const existingHistory: SyncHistoryEntry[] = [
      {
        id: 'h1',
        submissionId: 'sub_earlier',
        questionFrontendId: '704',
        questionTitle: 'Binary Search',
        questionSlug: 'binary-search',
        lang: 'python3',
        repo: 'user/repo',
        branch: 'main',
        folderPath: '0704-binary-search',
        solutionFilePath: '0704-binary-search/binary-search.py',
        readmeFilePath: '0704-binary-search/README.md',
        status: 'SUCCESS',
        timestamp: Date.now() - 10000,
      },
    ];

    const result = evaluateOverwritePolicy(baseSubmission, prefs, existingHistory);
    expect(result.shouldSync).toBe(true);
  });

  it('handles overwritePolicy="improved" by comparing runtimes', () => {
    const prefs: UserPreferences = {
      ...defaultPreferences,
      overwritePolicy: 'improved',
    };

    // Case A: Previous runtime was faster (30ms vs new 40ms) -> skip
    const historyWithFasterPrev: SyncHistoryEntry[] = [
      {
        id: 'h1',
        submissionId: 'sub_earlier',
        questionFrontendId: '704',
        questionTitle: 'Binary Search',
        questionSlug: 'binary-search',
        lang: 'python3',
        repo: 'user/repo',
        branch: 'main',
        folderPath: '0704-binary-search',
        solutionFilePath: '0704-binary-search/binary-search.py',
        readmeFilePath: '0704-binary-search/README.md',
        status: 'SUCCESS',
        timestamp: Date.now() - 10000,
        runtimeMs: 30,
      },
    ];

    const resA = evaluateOverwritePolicy(baseSubmission, prefs, historyWithFasterPrev);
    expect(resA.shouldSync).toBe(false);
    expect(resA.reason).toContain('Previous submission had better runtime');

    // Case B: Previous runtime was slower (60ms vs new 40ms) -> sync
    const historyWithSlowerPrev: SyncHistoryEntry[] = [
      {
        ...historyWithFasterPrev[0],
        runtimeMs: 60,
      },
    ];

    const resB = evaluateOverwritePolicy(baseSubmission, prefs, historyWithSlowerPrev);
    expect(resB.shouldSync).toBe(true);
  });
});

describe('Sync Engine - GitHub Git Data API Pipeline', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('successfully completes atomic commit pipeline', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method || 'GET';

      // 1. GET branch ref
      if (url.includes('/git/ref/heads/main') && method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ object: { sha: 'commit-sha-1' } }),
        } as Response;
      }

      // 2. GET commit tree
      if (url.includes('/git/commits/commit-sha-1') && method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ tree: { sha: 'tree-sha-base' } }),
        } as Response;
      }

      // 3. POST blob
      if (url.includes('/git/blobs') && method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => ({ sha: 'blob-sha-xyz' }),
        } as Response;
      }

      // 4. POST tree
      if (url.includes('/git/trees') && method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => ({ sha: 'tree-sha-new' }),
        } as Response;
      }

      // 5. POST commit
      if (url.includes('/git/commits') && method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            sha: 'commit-sha-new',
            html_url: 'https://github.com/user/repo/commit/commit-sha-new',
          }),
        } as Response;
      }

      // 6. PATCH ref
      if (url.includes('/git/refs/heads/main') && method === 'PATCH') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ref: 'refs/heads/main' }),
        } as Response;
      }

      throw new Error(`Unhandled mock fetch: ${method} ${url}`);
    });

    const result = await executeAtomicCommit(
      'mock-token',
      'user',
      'repo',
      'main',
      'feat: solve problem',
      [
        { path: '0704-binary-search/binary-search.py', content: 'code' },
        { path: '0704-binary-search/README.md', content: 'readme' },
      ],
    );

    expect(result.commitSha).toBe('commit-sha-new');
    expect(result.commitUrl).toBe('https://github.com/user/repo/commit/commit-sha-new');
    expect(fetchMock).toHaveBeenCalledTimes(7);
  });

  it('handles initial commit on an empty repository branch (404 ref fallback)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method || 'GET';

      // 1. GET branch ref returns 404 (empty branch)
      if (url.includes('/git/ref/heads/main') && method === 'GET') {
        return {
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as Response;
      }

      // 2. Blobs
      if (url.includes('/git/blobs') && method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => ({ sha: 'blob-sha' }),
        } as Response;
      }

      // 3. Tree without base_tree
      if (url.includes('/git/trees') && method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => ({ sha: 'tree-sha-initial' }),
        } as Response;
      }

      // 4. Commit without parents
      if (url.includes('/git/commits') && method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            sha: 'commit-sha-initial',
            html_url: 'https://github.com/user/repo/commit/commit-sha-initial',
          }),
        } as Response;
      }

      // 5. POST to /git/refs to create the new branch ref
      if (url.includes('/git/refs') && method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => ({ ref: 'refs/heads/main' }),
        } as Response;
      }

      throw new Error(`Unhandled mock fetch: ${method} ${url}`);
    });

    const result = await executeAtomicCommit(
      'mock-token',
      'user',
      'repo',
      'main',
      'feat: initial commit',
      [{ path: 'solution.py', content: 'code' }],
    );

    expect(result.commitSha).toBe('commit-sha-initial');
  });

  it('syncSubmissionToGitHub formats paths and coordinates full sync', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method || 'GET';

      if (url.includes('/git/ref/heads/main')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ object: { sha: 'c1' } }),
        } as Response;
      }
      if (url.includes('/git/commits/c1')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ tree: { sha: 't1' } }),
        } as Response;
      }
      if (url.includes('/git/blobs')) {
        return {
          ok: true,
          status: 201,
          json: async () => ({ sha: 'b1' }),
        } as Response;
      }
      if (url.includes('/git/trees')) {
        return {
          ok: true,
          status: 201,
          json: async () => ({ sha: 't2' }),
        } as Response;
      }
      if (url.includes('/git/commits')) {
        return {
          ok: true,
          status: 201,
          json: async () => ({ sha: 'c2', html_url: 'https://github.com/u/r/commit/c2' }),
        } as Response;
      }
      if (url.includes('/git/refs/heads/main')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ref: 'refs/heads/main' }),
        } as Response;
      }

      throw new Error(`Unhandled fetch: ${method} ${url}`);
    });

    const submission: SubmissionData = {
      submissionId: '999',
      questionId: '704',
      questionFrontendId: '704',
      questionTitle: 'Binary Search',
      questionSlug: 'binary-search',
      status: 'Accepted',
      lang: 'python3',
      code: 'print(1)',
      timestamp: Date.now(),
    };

    const problem: ProblemMetadata = {
      questionId: '704',
      questionFrontendId: '704',
      title: 'Binary Search',
      titleSlug: 'binary-search',
      difficulty: 'Easy',
      topicTags: [],
    };

    const repo: SelectedRepository = {
      id: 1,
      name: 'repo',
      fullName: 'u/repo',
      owner: 'u',
      isPrivate: false,
      defaultBranch: 'main',
      targetBranch: 'main',
    };

    const preferences: UserPreferences = {
      autoSync: true,
      overwritePolicy: 'always',
      commitMessageFormat: 'feat: {title}',
      folderNamingFormat: '{zero-padded-id}-{slug}',
    };

    const syncResult = await syncSubmissionToGitHub({
      submission,
      problem,
      token: 'tok',
      repo,
      preferences,
      syncHistory: [],
    });

    expect(syncResult.success).toBe(true);
    expect(syncResult.status).toBe('SUCCESS');
    expect(syncResult.commitSha).toBe('c2');
    expect(syncResult.folderPath).toBe('0704-binary-search');
    expect(syncResult.solutionPath).toBe('0704-binary-search/binary-search.py');
    expect(syncResult.readmePath).toBe('0704-binary-search/README.md');
  });
});
