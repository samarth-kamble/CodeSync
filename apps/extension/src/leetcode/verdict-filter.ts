import type { SubmissionStatus } from '@leetsync/shared';

export const ACCEPTED_STATUS = 'Accepted';

export const NON_ACCEPTED_STATUSES: readonly SubmissionStatus[] = [
  'Wrong Answer',
  'Time Limit Exceeded',
  'Memory Limit Exceeded',
  'Runtime Error',
  'Compile Error',
  'Output Limit Exceeded',
  'Pending',
  'Judging',
  'Unknown',
] as const;

/**
 * Normalizes and parses raw LeetCode status string into a typed SubmissionStatus.
 */
export function normalizeSubmissionStatus(rawStatus?: string | null): SubmissionStatus {
  if (!rawStatus) return 'Unknown';

  const trimmed = rawStatus.trim().toLowerCase();

  if (trimmed === 'accepted') return 'Accepted';
  if (trimmed.includes('wrong') || trimmed === 'wa') return 'Wrong Answer';
  if (trimmed.includes('time limit') || trimmed === 'tle') return 'Time Limit Exceeded';
  if (trimmed.includes('memory limit') || trimmed === 'mle') return 'Memory Limit Exceeded';
  if (trimmed.includes('runtime error') || trimmed === 're') return 'Runtime Error';
  if (trimmed.includes('compile error') || trimmed === 'ce') return 'Compile Error';
  if (trimmed.includes('output limit') || trimmed === 'ole') return 'Output Limit Exceeded';
  if (trimmed === 'pending') return 'Pending';
  if (trimmed === 'judging') return 'Judging';

  return 'Unknown';
}

/**
 * Strictly verifies whether a submission verdict is 'Accepted'.
 * Every other status is rejected unconditionally.
 */
export function verifyAcceptedStatus(rawStatus?: string | null): boolean {
  return normalizeSubmissionStatus(rawStatus) === ACCEPTED_STATUS;
}

