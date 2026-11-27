import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SyncHistoryEntry, SubmissionData } from '@leetsync/shared';
import { computeSyncAnalytics, toLocalDateKey } from '../src/analytics/streak';
import {
  isAuth401Error,
  isTransientNetworkError,
  enqueueRetryItem,
  flushRetryQueue,
} from '../src/background/index';

const DAY_MS = 24 * 60 * 60 * 1000;

function makeHistoryEntry(
  overrides: Partial<SyncHistoryEntry> & { timestamp: number },
): SyncHistoryEntry {
  return {
    id: `id-${overrides.timestamp}-${Math.random()}`,
    submissionId: `sub-${overrides.timestamp}`,
    questionId: '1',
    questionFrontendId: '1',
    questionTitle: 'Two Sum',
    questionSlug: 'two-sum',
    lang: 'java',
    repo: 'user/dsa',
    branch: 'main',
    folderPath: 'leetcode/0001-two-sum',
    solutionFilePath: 'leetcode/0001-two-sum/two-sum.java',
    readmeFilePath: 'leetcode/0001-two-sum/README.md',
    status: 'SUCCESS',
    ...overrides,
  };
}

describe('Student Streak Tracker & Sync Analytics', () => {
  it('computes current streak, longest streak, today count, and platform breakdown', () => {
    const now = new Date(2026, 10, 27, 12, 0, 0).getTime();
    const history: SyncHistoryEntry[] = [
      makeHistoryEntry({ timestamp: now, platform: 'gfg' }),
      makeHistoryEntry({ timestamp: now - 1000, platform: 'leetcode' }),
      makeHistoryEntry({ timestamp: now - DAY_MS, platform: 'leetcode' }),
      makeHistoryEntry({ timestamp: now - 2 * DAY_MS, platform: 'gfg' }),
      // Gap at -3 days
      makeHistoryEntry({ timestamp: now - 4 * DAY_MS, platform: 'leetcode' }),
      makeHistoryEntry({ timestamp: now - 5 * DAY_MS, platform: 'leetcode' }),
      makeHistoryEntry({ timestamp: now - 6 * DAY_MS, platform: 'leetcode' }),
      makeHistoryEntry({ timestamp: now - 7 * DAY_MS, platform: 'leetcode' }),
      // Failed entry should be excluded
      makeHistoryEntry({ timestamp: now, status: 'FAILED', platform: 'gfg' }),
    ];

    const analytics = computeSyncAnalytics(history, now, 14);

    expect(analytics.totalSynced).toBe(8);
    expect(analytics.todayCount).toBe(2);
    expect(analytics.currentStreak).toBe(3);
    expect(analytics.longestStreak).toBe(4);
    expect(analytics.platformBreakdown).toEqual({
      leetcode: 6,
      gfg: 2,
      hackerrank: 0,
      codechef: 0,
    });
    expect(analytics.heatmapDays).toHaveLength(14);
    expect(analytics.heatmapDays[13]).toEqual({
      date: toLocalDateKey(now),
      count: 2,
      level: 2,
    });
  });

  it('keeps streak alive when solved yesterday even if not yet solved today', () => {
    const now = new Date(2026, 10, 27, 12, 0, 0).getTime();
    const history: SyncHistoryEntry[] = [
      makeHistoryEntry({ timestamp: now - DAY_MS }),
      makeHistoryEntry({ timestamp: now - 2 * DAY_MS }),
    ];

    const analytics = computeSyncAnalytics(history, now, 7);
    expect(analytics.todayCount).toBe(0);
    expect(analytics.currentStreak).toBe(2);
  });
});

describe('Error Classification & Auto-Retry Queue', () => {
  const memoryStore = new Map<string, string>();

  beforeEach(() => {
    memoryStore.clear();
    vi.restoreAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => memoryStore.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memoryStore.set(k, v);
      },
      removeItem: (k: string) => {
        memoryStore.delete(k);
      },
      clear: () => {
        memoryStore.clear();
      },
    });
  });

  it('distinguishes 401 auth errors from transient network errors', () => {
    expect(isAuth401Error('GitHub session expired (401) — reconnect in Settings')).toBe(true);
    expect(isAuth401Error('Failed to create blob: 401 Unauthorized')).toBe(true);
    expect(isTransientNetworkError('GitHub session expired (401)')).toBe(false);

    expect(isTransientNetworkError('TypeError: Failed to fetch')).toBe(true);
    expect(isTransientNetworkError('Failed to create blob: 503 Service Unavailable')).toBe(true);
    expect(isTransientNetworkError('Failed to create blob: 429 Too Many Requests')).toBe(true);
  });

  it('enqueues failed submissions without duplicating submissionId', async () => {
    const submission: SubmissionData = {
      platform: 'gfg',
      submissionId: 'gfg-123',
      questionId: '123',
      questionFrontendId: '123',
      questionTitle: 'Second Largest',
      questionSlug: 'second-largest',
      status: 'Accepted',
      lang: 'java',
      code: 'class Solution {}',
      timestamp: Date.now(),
    };

    await enqueueRetryItem(submission, 'Failed to fetch');
    await enqueueRetryItem(submission, 'Failed to fetch');

    const stored = JSON.parse(localStorage.getItem('codesync_retryQueue') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].submission.submissionId).toBe('gfg-123');
  });

  it('marks sessionExpired when retry flush hits 401', async () => {
    localStorage.setItem(
      'codesync_auth',
      JSON.stringify({
        isConnected: true,
        user: { id: 1, login: 'student', name: 'Student', avatarUrl: '', htmlUrl: '' },
        token: 'expired-token',
        sessionExpired: false,
      }),
    );
    localStorage.setItem(
      'codesync_selectedRepo',
      JSON.stringify({
        id: 1,
        name: 'dsa',
        fullName: 'student/dsa',
        owner: 'student',
        isPrivate: false,
        defaultBranch: 'main',
        targetBranch: 'main',
      }),
    );

    const submission: SubmissionData = {
      platform: 'leetcode',
      submissionId: '999',
      questionId: '1',
      questionFrontendId: '1',
      questionTitle: 'Two Sum',
      questionSlug: 'two-sum',
      status: 'Accepted',
      lang: 'java',
      code: 'class Solution {}',
      timestamp: Date.now(),
    };

    await enqueueRetryItem(submission, 'Failed to fetch');

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('leetcode.com/graphql')) {
        return new Response(JSON.stringify({ data: { question: null } }), { status: 200 });
      }
      return new Response(JSON.stringify({ message: 'Bad credentials' }), {
        status: 401,
        statusText: 'Unauthorized',
      });
    });

    const summary = await flushRetryQueue(true);
    expect(summary.remaining).toBe(1);

    const authAfter = JSON.parse(localStorage.getItem('codesync_auth') || '{}');
    expect(authAfter.sessionExpired).toBe(true);
  });
});
