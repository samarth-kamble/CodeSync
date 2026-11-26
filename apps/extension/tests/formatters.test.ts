import { describe, it, expect } from 'vitest';
import {
  padProblemNumber,
  sanitizePathComponent,
  getProblemFolderPath,
  getLanguageFileExtension,
  getSolutionFilename,
  decodeHtmlEntities,
  convertHtmlToMarkdown,
  getDifficultyShieldBadge,
  generateProblemReadme,
  getCommentSyntax,
  generateSolutionHeader,
  formatSolutionCode,
  formatCommitMessage,
  DEFAULT_COMMIT_FORMAT,
  type ProblemMetadata,
  type SubmissionData,
} from '@leetsync/shared';

describe('Path & Filename Formatters', () => {
  it('pads problem numbers to 4 digits or retains larger lengths', () => {
    expect(padProblemNumber(1)).toBe('0001');
    expect(padProblemNumber('42')).toBe('0042');
    expect(padProblemNumber(704)).toBe('0704');
    expect(padProblemNumber('2305')).toBe('2305');
    expect(padProblemNumber(10482)).toBe('10482');
    expect(padProblemNumber('custom-id')).toBe('custom-id');
  });

  it('sanitizes illegal path characters across platforms', () => {
    expect(sanitizePathComponent('Hello: World?*<>|')).toBe('hello-world');
    expect(sanitizePathComponent('  two  sum  ')).toBe('two-sum');
    expect(sanitizePathComponent('..invalid.name..')).toBe('invalid-name');
  });

  it('generates standardized problem folder paths', () => {
    expect(getProblemFolderPath('704', 'binary-search')).toBe('0704-binary-search');
    expect(getProblemFolderPath(1, 'two-sum')).toBe('0001-two-sum');
    expect(
      getProblemFolderPath('15', '3sum', 'leetcode-{zero-padded-id}/{slug}'),
    ).toBe('leetcode-0015-3sum');
  });

  it('organizes folders by topic, difficulty, or language when configured', () => {
    // SQL question by language or database tag
    expect(
      getProblemFolderPath('175', 'combine-two-tables', '{zero-padded-id}-{slug}', {
        organization: 'topic',
        langSlug: 'mysql',
        topicTags: [{ name: 'Database', slug: 'database' }],
      }),
    ).toBe('sql/0175-combine-two-tables');

    // DP takes priority over Array
    expect(
      getProblemFolderPath('198', 'house-robber', '{zero-padded-id}-{slug}', {
        organization: 'topic',
        langSlug: 'python3',
        topicTags: [
          { name: 'Array', slug: 'array' },
          { name: 'Dynamic Programming', slug: 'dynamic-programming' },
        ],
      }),
    ).toBe('dynamic-programming/0198-house-robber');

    // Linked List
    expect(
      getProblemFolderPath('206', 'reverse-linked-list', '{zero-padded-id}-{slug}', {
        organization: 'topic',
        langSlug: 'cpp',
        topicTags: [
          { name: 'Linked List', slug: 'linked-list' },
          { name: 'Recursion', slug: 'recursion' },
        ],
      }),
    ).toBe('linked-list/0206-reverse-linked-list');

    // Difficulty organization
    expect(
      getProblemFolderPath('704', 'binary-search', '{zero-padded-id}-{slug}', {
        organization: 'difficulty',
        difficulty: 'Easy',
      }),
    ).toBe('easy/0704-binary-search');

    // Language organization (SQL normalized to sql/)
    expect(
      getProblemFolderPath('175', 'combine-two-tables', '{zero-padded-id}-{slug}', {
        organization: 'language',
        langSlug: 'postgresql',
      }),
    ).toBe('sql/0175-combine-two-tables');
  });

  it('maps language slugs to canonical file extensions', () => {
    expect(getLanguageFileExtension('python3')).toBe('py');
    expect(getLanguageFileExtension('python')).toBe('py');
    expect(getLanguageFileExtension('cpp')).toBe('cpp');
    expect(getLanguageFileExtension('typescript')).toBe('ts');
    expect(getLanguageFileExtension('javascript')).toBe('js');
    expect(getLanguageFileExtension('golang')).toBe('go');
    expect(getLanguageFileExtension('rust')).toBe('rs');
    expect(getLanguageFileExtension('mysql')).toBe('sql');
  });

  it('generates solution filenames according to selected style', () => {
    expect(getSolutionFilename('two-sum', 'python3', 'slug')).toBe('two-sum.py');
    expect(getSolutionFilename('two-sum', 'python3', 'solution')).toBe('solution.py');
    expect(getSolutionFilename('two-sum', 'python3', 'numbered', '1')).toBe('0001-two-sum.py');
  });
});

describe('HTML to Markdown Formatter', () => {
  it('decodes standard HTML entities', () => {
    const raw = '&lt;div&gt;nums[i] &amp; nums[j] &gt;= 10 &quot;val&quot; &#39;test&#39;&nbsp;&le;&ge;&lt;/div&gt;';
    const decoded = decodeHtmlEntities(raw);
    expect(decoded).toContain('<div>');
    expect(decoded).toContain('nums[i] & nums[j] >= 10 "val" \'test\' <=>=</div>');
  });

  it('converts LeetCode HTML description into clean Markdown', () => {
    const html = `
      <p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers.</p>
      <p>You may assume that each input would have <strong>exactly one solution</strong>.</p>
      <pre>
<strong>Input:</strong> nums = [2,7,11,15], target = 9
<strong>Output:</strong> [0,1]
<strong>Explanation:</strong> Because nums[0] + nums[1] == 9, we return [0, 1].
      </pre>
      <ul>
        <li><code>2 &le; nums.length &le; 10<sup>4</sup></code></li>
      </ul>
    `;

    const md = convertHtmlToMarkdown(html);
    expect(md).toContain('Given an array of integers `nums` and an integer `target`');
    expect(md).toContain('**exactly one solution**');
    expect(md).toContain('```text\nInput: nums = [2,7,11,15], target = 9');
    expect(md).toContain('`2 <= nums.length <= 10^4`');
  });
});

describe('README Generator', () => {
  const mockProblem: ProblemMetadata = {
    questionId: '704',
    questionFrontendId: '704',
    title: 'Binary Search',
    titleSlug: 'binary-search',
    difficulty: 'Easy',
    contentHtml: '<p>Given an array of integers <code>nums</code> which is sorted in ascending order...</p>',
    topicTags: [
      { name: 'Array', slug: 'array' },
      { name: 'Binary Search', slug: 'binary-search' },
    ],
  };

  const mockSubmission: SubmissionData = {
    submissionId: '987654321',
    questionId: '704',
    questionFrontendId: '704',
    questionTitle: 'Binary Search',
    questionSlug: 'binary-search',
    status: 'Accepted',
    lang: 'python3',
    code: 'def search(self, nums: List[int], target: int) -> int:\n    pass',
    timestamp: 1716120000000,
    stats: {
      runtimeMs: 45,
      runtimeDisplay: '45 ms',
      runtimePercentile: 91.24,
      memoryBytes: 18454937,
      memoryDisplay: '17.6 MB',
      memoryPercentile: 82.15,
    },
  };

  it('resolves correct difficulty shield badges', () => {
    expect(getDifficultyShieldBadge('Easy')).toContain('Difficulty-Easy-brightgreen');
    expect(getDifficultyShieldBadge('Medium')).toContain('Difficulty-Medium-orange');
    expect(getDifficultyShieldBadge('Hard')).toContain('Difficulty-Hard-red');
  });

  it('generates rich problem README with stats and tags', () => {
    const readme = generateProblemReadme(mockProblem, mockSubmission);

    expect(readme).toContain('# [704. Binary Search](https://leetcode.com/problems/binary-search/)');
    expect(readme).toContain('![Difficulty: Easy](https://img.shields.io/badge/Difficulty-Easy-brightgreen)');
    expect(readme).toContain('**Topic Tags:** `Array` `Binary Search`');
    expect(readme).toContain('## Problem Statement');
    expect(readme).toContain('Given an array of integers `nums` which is sorted in ascending order...');
    expect(readme).toContain('## Submissions & Benchmarks');
    expect(readme).toContain('| **Runtime** | `45 ms` | Beats 91.24% of Python 3 submissions |');
    expect(readme).toContain('| **Memory** | `17.6 MB` | Beats 82.15% of Python 3 submissions |');
    expect(readme).toContain('*Synchronized automatically with [CodeSync](https://github.com/samarth-kamble/CodeSync).*');
  });

  it('handles README generation when submission stats are not present', () => {
    const readme = generateProblemReadme(mockProblem, null);
    expect(readme).toContain('# [704. Binary Search]');
    expect(readme).not.toContain('## Submissions & Benchmarks');
    expect(readme).toContain('*Synchronized automatically with [CodeSync]');
  });
});

describe('Solution Code Formatter', () => {
  const mockProblem: ProblemMetadata = {
    questionId: '1',
    questionFrontendId: '1',
    title: 'Two Sum',
    titleSlug: 'two-sum',
    difficulty: 'Easy',
    topicTags: [],
  };

  const mockPythonSubmission: SubmissionData = {
    submissionId: '111',
    questionId: '1',
    questionFrontendId: '1',
    questionTitle: 'Two Sum',
    questionSlug: 'two-sum',
    status: 'Accepted',
    lang: 'python3',
    code: 'class Solution:\n    def twoSum(self, nums, target):\n        return []',
    timestamp: 1716120000000,
    stats: {
      runtimeMs: 50,
      runtimeDisplay: '50 ms',
      runtimePercentile: 85.5,
      memoryBytes: 15728640,
      memoryDisplay: '15.0 MB',
      memoryPercentile: 70.2,
    },
  };

  const mockCppSubmission: SubmissionData = {
    ...mockPythonSubmission,
    lang: 'cpp',
    code: 'class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {}\n};',
  };

  it('identifies syntax-appropriate comment markers', () => {
    expect(getCommentSyntax('python')).toBe('hash');
    expect(getCommentSyntax('python3')).toBe('hash');
    expect(getCommentSyntax('ruby')).toBe('hash');
    expect(getCommentSyntax('mysql')).toBe('dash');
    expect(getCommentSyntax('postgresql')).toBe('dash');
    expect(getCommentSyntax('cpp')).toBe('block');
    expect(getCommentSyntax('java')).toBe('block');
    expect(getCommentSyntax('typescript')).toBe('block');
  });

  it('generates hash comments for Python code', () => {
    const formatted = formatSolutionCode(mockPythonSubmission.code, mockPythonSubmission, mockProblem);
    expect(formatted).toContain('# Problem  : 1. Two Sum');
    expect(formatted).toContain('# Diff     : Easy');
    expect(formatted).toContain('# Language : Python 3');
    expect(formatted).toContain('# Runtime  : 50 ms (Beats 85.50%)');
    expect(formatted).toContain('# Synced   : CodeSync');
    expect(formatted).toContain('class Solution:');
  });

  it('generates block comments for C++ code', () => {
    const formatted = formatSolutionCode(mockCppSubmission.code, mockCppSubmission, mockProblem);
    expect(formatted).toContain('/**');
    expect(formatted).toContain(' * Problem  : 1. Two Sum');
    expect(formatted).toContain(' * Language : C++');
    expect(formatted).toContain(' * Synced   : CodeSync');
    expect(formatted).toContain(' */');
    expect(formatted).toContain('class Solution {');
  });

  it('prevents header duplication when formatting already-commented code', () => {
    const formattedOnce = formatSolutionCode(mockPythonSubmission.code, mockPythonSubmission, mockProblem);
    const formattedTwice = formatSolutionCode(formattedOnce, mockPythonSubmission, mockProblem);

    const matches = formattedTwice.match(/Synced\s*:\s*CodeSync/g);
    expect(matches?.length).toBe(1);
  });
});

describe('Commit Message Formatter', () => {
  const mockProblem: ProblemMetadata = {
    questionId: '704',
    questionFrontendId: '704',
    title: 'Binary Search',
    titleSlug: 'binary-search',
    difficulty: 'Easy',
    topicTags: [],
  };

  const mockSubmission: SubmissionData = {
    submissionId: '987',
    questionId: '704',
    questionFrontendId: '704',
    questionTitle: 'Binary Search',
    questionSlug: 'binary-search',
    status: 'Accepted',
    lang: 'python3',
    code: 'code',
    timestamp: 1716120000000,
    stats: {
      runtimeMs: 45,
      runtimeDisplay: '45 ms',
      runtimePercentile: 91.24,
      memoryBytes: 18454937,
      memoryDisplay: '17.6 MB',
      memoryPercentile: 82.15,
    },
  };

  it('formats default commit message pattern properly', () => {
    const msg = formatCommitMessage(DEFAULT_COMMIT_FORMAT, mockSubmission, mockProblem);
    expect(msg).toBe('Time: 45 ms (91.24%) | Memory: 17.6 MB (82.15%) - CodeSync');
  });

  it('interpolates custom templates with zero-padded IDs and percentiles', () => {
    const customTemplate =
      'Sync [{zero-padded-id}] {title} ({lang}) - Runtime: {runtime} ({runtimePercentile}) [Difficulty: {difficulty}]';

    const msg = formatCommitMessage(customTemplate, mockSubmission, mockProblem);
    expect(msg).toBe(
      'Sync [0704] Binary Search (Python 3) - Runtime: 45 ms (91.24%) [Difficulty: Easy]',
    );
  });
});

