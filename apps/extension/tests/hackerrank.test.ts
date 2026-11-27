import { describe, it, expect } from 'vitest';
import {
  extractHackerRankSlugFromUrl,
  normalizeHackerRankDifficulty,
  normalizeHackerRankLanguage,
  isHackerRankAcceptedVerdict,
} from '../src/hackerrank/client';
import { getProblemUrl } from '@leetsync/shared';

describe('HackerRank Platform Support', () => {
  it('extracts challenge slugs from HackerRank URLs', () => {
    expect(
      extractHackerRankSlugFromUrl('https://www.hackerrank.com/challenges/solve-me-first/problem'),
    ).toBe('solve-me-first');
    expect(
      extractHackerRankSlugFromUrl('https://www.hackerrank.com/contests/week-1/challenges/two-arrays/problem'),
    ).toBe('two-arrays');
    expect(
      extractHackerRankSlugFromUrl('https://leetcode.com/problems/two-sum/'),
    ).toBeNull();
  });

  it('normalizes HackerRank difficulties and languages', () => {
    expect(normalizeHackerRankDifficulty('Easy')).toBe('Easy');
    expect(normalizeHackerRankDifficulty('Medium')).toBe('Medium');
    expect(normalizeHackerRankDifficulty('Hard')).toBe('Hard');
    expect(normalizeHackerRankDifficulty('Difficult')).toBe('Hard');

    expect(normalizeHackerRankLanguage('cpp20')).toBe('cpp');
    expect(normalizeHackerRankLanguage('java15')).toBe('java');
    expect(normalizeHackerRankLanguage('python3')).toBe('python3');
    expect(normalizeHackerRankLanguage('nodejs')).toBe('javascript');
    expect(normalizeHackerRankLanguage('mysql')).toBe('mysql');
  });

  it('enforces strict Accepted-only verdict gate for HackerRank', () => {
    expect(isHackerRankAcceptedVerdict({ status: 'Accepted' })).toBe(true);
    expect(isHackerRankAcceptedVerdict({ is_accepted: true, status: 'Accepted' })).toBe(true);

    // Reject Run Code / compile_test and failed verdicts
    expect(
      isHackerRankAcceptedVerdict({ status: 'Accepted', compile_test: true }),
    ).toBe(false);
    expect(
      isHackerRankAcceptedVerdict({ status: 'Accepted', is_sample: true }),
    ).toBe(false);
    expect(
      isHackerRankAcceptedVerdict({ status: 'Accepted', kind: 'compile_test' }),
    ).toBe(false);
    expect(
      isHackerRankAcceptedVerdict({ status: 'Wrong Answer' }),
    ).toBe(false);
    expect(
      isHackerRankAcceptedVerdict({ status: 'Terminated due to timeout' }),
    ).toBe(false);
    expect(
      isHackerRankAcceptedVerdict({ status: 'Compilation Error' }),
    ).toBe(false);
  });

  it('resolves canonical HackerRank problem URLs', () => {
    expect(getProblemUrl('solve-me-first', 'hackerrank')).toBe(
      'https://www.hackerrank.com/challenges/solve-me-first/problem',
    );
  });
});
