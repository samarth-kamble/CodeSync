import { describe, it, expect } from 'vitest';
import {
  verifyAcceptedStatus,
  normalizeSubmissionStatus,
  NON_ACCEPTED_STATUSES,
} from '../src/leetcode/verdict-filter';

describe('LeetCode Verdict Filter & Strict Accepted Policy', () => {
  it('returns true for exact "Accepted" status', () => {
    expect(verifyAcceptedStatus('Accepted')).toBe(true);
    expect(verifyAcceptedStatus('accepted')).toBe(true);
    expect(verifyAcceptedStatus(' ACCEPTED ')).toBe(true);
  });

  it('rejects all non-accepted statuses unconditionally', () => {
    for (const status of NON_ACCEPTED_STATUSES) {
      expect(verifyAcceptedStatus(status)).toBe(false);
    }
  });

  it('rejects partial or intermediate judging states', () => {
    expect(verifyAcceptedStatus('Pending')).toBe(false);
    expect(verifyAcceptedStatus('Judging')).toBe(false);
    expect(verifyAcceptedStatus('Judging (15/45 testcases passed)')).toBe(false);
  });

  it('rejects undefined, null, or empty string', () => {
    expect(verifyAcceptedStatus(null)).toBe(false);
    expect(verifyAcceptedStatus(undefined)).toBe(false);
    expect(verifyAcceptedStatus('')).toBe(false);
    expect(verifyAcceptedStatus('   ')).toBe(false);
  });

  it('normalizes raw status strings correctly', () => {
    expect(normalizeSubmissionStatus('Accepted')).toBe('Accepted');
    expect(normalizeSubmissionStatus('Wrong Answer')).toBe('Wrong Answer');
    expect(normalizeSubmissionStatus('Time Limit Exceeded')).toBe('Time Limit Exceeded');
    expect(normalizeSubmissionStatus('Memory Limit Exceeded')).toBe('Memory Limit Exceeded');
    expect(normalizeSubmissionStatus('Runtime Error')).toBe('Runtime Error');
    expect(normalizeSubmissionStatus('Compile Error')).toBe('Compile Error');
    expect(normalizeSubmissionStatus('Output Limit Exceeded')).toBe('Output Limit Exceeded');
    expect(normalizeSubmissionStatus('Random gibberish')).toBe('Unknown');
  });
});

