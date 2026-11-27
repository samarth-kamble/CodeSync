import { describe, it, expect } from 'vitest';
import { generateRootReadme, type SyncHistoryEntry } from '@leetsync/shared';

describe('Root Repository README Progress Table', () => {
  const entries: SyncHistoryEntry[] = [
    {
      id: '1',
      submissionId: 's1',
      questionFrontendId: '704',
      questionTitle: 'Binary Search',
      questionSlug: 'binary-search',
      difficulty: 'Easy',
      lang: 'python3',
      repo: 'user/leetcode',
      branch: 'main',
      folderPath: '0704-binary-search',
      solutionFilePath: '0704-binary-search/binary-search.py',
      readmeFilePath: '0704-binary-search/README.md',
      status: 'SUCCESS',
      timestamp: 1000,
      runtimeDisplay: '35 ms',
      memoryDisplay: '17.4 MB',
    },
    {
      id: '2',
      submissionId: 's2',
      questionFrontendId: '1',
      questionTitle: 'Two Sum',
      questionSlug: 'two-sum',
      difficulty: 'Easy',
      lang: 'cpp',
      repo: 'user/leetcode',
      branch: 'main',
      folderPath: '0001-two-sum',
      solutionFilePath: '0001-two-sum/two-sum.cpp',
      readmeFilePath: '0001-two-sum/README.md',
      status: 'SUCCESS',
      timestamp: 2000,
      runtimeDisplay: '2 ms',
      memoryDisplay: '12.1 MB',
    },
    {
      id: '3',
      submissionId: 's3',
      questionFrontendId: '1',
      questionTitle: 'Two Sum',
      questionSlug: 'two-sum',
      difficulty: 'Easy',
      lang: 'python3',
      repo: 'user/leetcode',
      branch: 'main',
      folderPath: '0001-two-sum',
      solutionFilePath: '0001-two-sum/two-sum.py',
      readmeFilePath: '0001-two-sum/README.md',
      status: 'SUCCESS',
      timestamp: 3000, // newer submission for #1 should replace older
      runtimeDisplay: '1 ms',
      memoryDisplay: '16.0 MB',
    },
    {
      id: '4',
      submissionId: 's4',
      questionFrontendId: '42',
      questionTitle: 'Trapping Rain Water',
      questionSlug: 'trapping-rain-water',
      difficulty: 'Hard',
      lang: 'typescript',
      repo: 'user/leetcode',
      branch: 'main',
      folderPath: '0042-trapping-rain-water',
      solutionFilePath: '0042-trapping-rain-water/trapping-rain-water.ts',
      readmeFilePath: '0042-trapping-rain-water/README.md',
      status: 'FAILED', // failed entries should be excluded
      timestamp: 4000,
    },
  ];

  it('deduplicates solved problems, counts difficulties, and sorts numerically', () => {
    const md = generateRootReadme(entries, 'user/leetcode');

    expect(md).toContain('# user/leetcode — Coding Solutions');
    expect(md).toContain('Total%20Solved-2-blue');
    expect(md).toContain('Easy-2-brightgreen');
    expect(md).toContain('Medium-0-orange');
    expect(md).toContain('Hard-0-red');

    // #1 should appear before #704 and use the newer Python 3 submission
    const idx1 = md.indexOf('| 1 | [Two Sum]');
    const idx704 = md.indexOf('| 704 | [Binary Search]');
    expect(idx1).toBeGreaterThan(-1);
    expect(idx704).toBeGreaterThan(idx1);
    expect(md).toContain('| 1 | [Two Sum](https://leetcode.com/problems/two-sum/) | Easy | Python 3 | 1 ms | 16.0 MB | [Code](./0001-two-sum/two-sum.py) |');
    expect(md).not.toContain('Trapping Rain Water');
  });
});
