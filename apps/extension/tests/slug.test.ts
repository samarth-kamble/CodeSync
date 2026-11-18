import { describe, it, expect } from 'vitest';
import { extractProblemSlugFromUrl } from '../src/leetcode/client';

describe('LeetCode URL Slug Extractor', () => {
  it('extracts slug from standard problem URL', () => {
    expect(extractProblemSlugFromUrl('https://leetcode.com/problems/two-sum/')).toBe('two-sum');
    expect(extractProblemSlugFromUrl('https://leetcode.com/problems/binary-search')).toBe('binary-search');
  });

  it('extracts slug from submissions tab URL', () => {
    expect(
      extractProblemSlugFromUrl('https://leetcode.com/problems/binary-search/submissions/12345/'),
    ).toBe('binary-search');
  });

  it('extracts slug from solutions or description tab URL', () => {
    expect(
      extractProblemSlugFromUrl('https://leetcode.com/problems/longest-substring-without-repeating-characters/description/'),
    ).toBe('longest-substring-without-repeating-characters');
  });

  it('handles uppercase slugs by normalizing to lowercase', () => {
    expect(extractProblemSlugFromUrl('https://leetcode.com/problems/TWO-SUM/')).toBe('two-sum');
  });

  it('returns null for non-problem URLs or invalid URLs', () => {
    expect(extractProblemSlugFromUrl('https://leetcode.com/explore/')).toBe(null);
    expect(extractProblemSlugFromUrl('not-a-valid-url')).toBe(null);
  });
});

