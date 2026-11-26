import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  type SyncHistoryEntry,
} from '@leetsync/shared';
import {
  filterHistoryEntries,
  serializeHistoryForExport,
} from '../src/settings/tabs/HistoryTab';
import { shouldSendNotification } from '../src/background/index';

describe('History Management & Export', () => {
  const sampleHistory: SyncHistoryEntry[] = [
    {
      id: 'h1',
      submissionId: '1001',
      questionFrontendId: '1',
      questionTitle: 'Two Sum',
      questionSlug: 'two-sum',
      lang: 'python3',
      repo: 'user/leetcode',
      branch: 'main',
      folderPath: '0001-two-sum',
      solutionFilePath: '0001-two-sum/two-sum.py',
      readmeFilePath: '0001-two-sum/README.md',
      commitSha: 'abc1234',
      status: 'SUCCESS',
      timestamp: 1716120000000,
      runtimeDisplay: '45 ms',
      memoryDisplay: '17.6 MB',
    },
    {
      id: 'h2',
      submissionId: '1002',
      questionFrontendId: '704',
      questionTitle: 'Binary Search',
      questionSlug: 'binary-search',
      lang: 'cpp',
      repo: 'user/leetcode',
      branch: 'main',
      folderPath: '0704-binary-search',
      solutionFilePath: '0704-binary-search/binary-search.cpp',
      readmeFilePath: '0704-binary-search/README.md',
      status: 'FAILED',
      timestamp: 1716120500000,
      error: 'Bad credentials',
      code: 'int search() { return -1; }',
    },
    {
      id: 'h3',
      submissionId: '1003',
      questionFrontendId: '20',
      questionTitle: 'Valid Parentheses',
      questionSlug: 'valid-parentheses',
      lang: 'typescript',
      repo: 'user/leetcode',
      branch: 'main',
      folderPath: '0020-valid-parentheses',
      solutionFilePath: '0020-valid-parentheses/valid-parentheses.ts',
      readmeFilePath: '0020-valid-parentheses/README.md',
      status: 'SKIPPED',
      timestamp: 1716121000000,
    },
  ];

  it('filters history by status accurately', () => {
    expect(filterHistoryEntries(sampleHistory, '', 'ALL')).toHaveLength(3);
    expect(filterHistoryEntries(sampleHistory, '', 'SUCCESS')).toHaveLength(1);
    expect(filterHistoryEntries(sampleHistory, '', 'FAILED')).toHaveLength(1);
    expect(filterHistoryEntries(sampleHistory, '', 'SKIPPED')).toHaveLength(1);
  });

  it('filters history by title, problem ID, and language', () => {
    expect(filterHistoryEntries(sampleHistory, 'binary', 'ALL')).toHaveLength(1);
    expect(filterHistoryEntries(sampleHistory, '704', 'ALL')).toHaveLength(1);
    expect(filterHistoryEntries(sampleHistory, 'typescript', 'ALL')).toHaveLength(1);
    expect(filterHistoryEntries(sampleHistory, 'binary', 'SUCCESS')).toHaveLength(0);
  });

  it('serializes history to JSON while omitting cached code payloads', () => {
    const jsonString = serializeHistoryForExport(sampleHistory);
    const parsed = JSON.parse(jsonString) as Array<Record<string, unknown>>;

    expect(parsed).toHaveLength(3);
    expect(parsed[0].questionTitle).toBe('Two Sum');
    expect(parsed[0].runtimeDisplay).toBe('45 ms');
    expect(parsed[1].error).toBe('Bad credentials');
    expect(parsed[1].code).toBeUndefined();
  });
});

describe('Notification Preferences Gating', () => {
  it('enables notifications by default in DEFAULT_PREFERENCES', () => {
    expect(DEFAULT_PREFERENCES.enableNotifications).toBe(true);
    expect(shouldSendNotification(DEFAULT_PREFERENCES)).toBe(true);
    expect(shouldSendNotification(undefined)).toBe(true);
    expect(shouldSendNotification({})).toBe(true);
  });

  it('suppresses notifications when enableNotifications is false', () => {
    expect(shouldSendNotification({ enableNotifications: false })).toBe(false);
  });
});
