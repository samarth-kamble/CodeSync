import { describe, it, expect } from 'vitest';
import {
  extractGfgSlugFromUrl,
  normalizeGfgDifficulty,
  normalizeGfgLanguage,
  isGfgAcceptedVerdict,
} from '../src/gfg/client';
import {
  generateProblemReadme,
  generateSolutionHeader,
  getProblemFolderPath,
  type ProblemMetadata,
  type SubmissionData,
} from '@leetsync/shared';

describe('GeeksforGeeks (GFG) Integration', () => {
  it('extracts slug from GFG problem URLs', () => {
    expect(extractGfgSlugFromUrl('https://www.geeksforgeeks.org/problems/kadanes-algorithm-1587115620/1')).toBe(
      'kadanes-algorithm-1587115620',
    );
    expect(extractGfgSlugFromUrl('https://practice.geeksforgeeks.org/problems/two-sum/0')).toBe(
      'two-sum',
    );
    expect(extractGfgSlugFromUrl('https://leetcode.com/problems/two-sum/')).toBeNull();
  });

  it('normalizes GFG difficulties and language names', () => {
    expect(normalizeGfgDifficulty('School')).toBe('Easy');
    expect(normalizeGfgDifficulty('Basic')).toBe('Easy');
    expect(normalizeGfgDifficulty('Easy')).toBe('Easy');
    expect(normalizeGfgDifficulty('Medium')).toBe('Medium');
    expect(normalizeGfgDifficulty('Hard')).toBe('Hard');

    expect(normalizeGfgLanguage('C++ (g++ 5.4)')).toBe('cpp');
    expect(normalizeGfgLanguage('Python3')).toBe('python3');
    expect(normalizeGfgLanguage('Java')).toBe('java');
    expect(normalizeGfgLanguage('JavaScript(Node.js)')).toBe('javascript');
  });

  it('enforces strict accepted-only gate for GFG verdicts', () => {
    expect(
      isGfgAcceptedVerdict({
        status: 'SUCCESS',
        message: 'Problem Solved Successfully',
      }),
    ).toBe(true);

    expect(
      isGfgAcceptedVerdict({
        user_solution_status: 'correct',
      }),
    ).toBe(true);

    // Reject non-accepted & sample runs
    expect(
      isGfgAcceptedVerdict({
        status: 'SUCCESS',
        message: 'Wrong Answer',
      }),
    ).toBe(false);

    expect(
      isGfgAcceptedVerdict({
        status: 'SUCCESS',
        message: 'Time Limit Exceeded',
      }),
    ).toBe(false);

    expect(
      isGfgAcceptedVerdict({
        status: 'SUCCESS',
        message: 'Problem Solved Successfully',
        is_sample: true,
      }),
    ).toBe(false);

    expect(
      isGfgAcceptedVerdict({
        status: 'SUCCESS',
        message: 'Problem Solved Successfully',
        submission_type: 'compile',
      }),
    ).toBe(false);
  });

  it('formats GFG README, code header, and platform folder paths with geeksforgeeks.org links', () => {
    const gfgProblem: ProblemMetadata = {
      platform: 'gfg',
      problemUrl: 'https://www.geeksforgeeks.org/problems/kadanes-algorithm/1',
      questionId: '1587115620',
      questionFrontendId: '',
      title: "Kadane's Algorithm",
      titleSlug: 'kadanes-algorithm',
      difficulty: 'Medium',
      contentHtml: '<p>Given an integer array <code>arr[]</code>, find the contiguous sub-array.</p>',
      topicTags: [{ name: 'Arrays', slug: 'arrays' }],
    };

    const gfgSub: SubmissionData = {
      platform: 'gfg',
      problemUrl: 'https://www.geeksforgeeks.org/problems/kadanes-algorithm/1',
      submissionId: 'gfg_123',
      questionId: '1587115620',
      questionFrontendId: '',
      questionTitle: "Kadane's Algorithm",
      questionSlug: 'kadanes-algorithm',
      status: 'Accepted',
      lang: 'cpp',
      code: 'int maxSubarraySum(vector<int>& arr) { return 0; }',
      timestamp: 1716120000000,
      stats: { runtimeDisplay: '0.02 s' },
    };

    const readme = generateProblemReadme(gfgProblem, gfgSub);
    expect(readme).toContain("https://www.geeksforgeeks.org/problems/kadanes-algorithm/1");
    expect(readme).not.toContain('leetcode.com');

    const header = generateSolutionHeader(gfgSub, gfgProblem);
    expect(header).toContain('https://www.geeksforgeeks.org/problems/kadanes-algorithm/1');
    expect(header).not.toContain('leetcode.com');

    expect(
      getProblemFolderPath('', 'kadanes-algorithm', '{zero-padded-id}-{slug}', {
        organization: 'platform',
        platform: 'gfg',
      }),
    ).toBe('gfg/kadanes-algorithm');
  });
});
