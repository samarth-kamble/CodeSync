import type { SubmissionData } from '../types/submission.js';
import type { ProblemMetadata } from '../types/problem.js';
import { getLanguageDefinition } from '../constants/languages.js';
import { padProblemNumber } from './paths.js';

export const DEFAULT_COMMIT_FORMAT =
  'Time: {runtime} ({runtimePercentile}) | Memory: {memory} ({memoryPercentile}) - CodeSync';

/**
 * Formats a Git commit message based on the user's template and submission data.
 */
export function formatCommitMessage(
  formatPattern: string | undefined | null,
  submission: SubmissionData,
  problem?: ProblemMetadata | null,
): string {
  const pattern = (formatPattern && formatPattern.trim()) || DEFAULT_COMMIT_FORMAT;

  const rawNumber = problem?.questionFrontendId || submission.questionFrontendId || '';
  const paddedNumber = padProblemNumber(rawNumber);
  const title = problem?.title || submission.questionTitle || '';
  const lang = getLanguageDefinition(submission.lang).name;
  const difficulty = problem?.difficulty || '';
  const slug = problem?.titleSlug || submission.questionSlug || '';

  const runtime =
    submission.stats?.runtimeDisplay ||
    (submission.stats?.runtimeMs !== undefined ? `${submission.stats.runtimeMs}ms` : 'N/A');

  const memory =
    submission.stats?.memoryDisplay ||
    (submission.stats?.memoryBytes !== undefined
      ? `${(submission.stats.memoryBytes / 1024 / 1024).toFixed(1)}MB`
      : 'N/A');

  const runtimePercentile =
    submission.stats?.runtimePercentile !== undefined
      ? `${submission.stats.runtimePercentile.toFixed(2)}%`
      : 'N/A';

  const memoryPercentile =
    submission.stats?.memoryPercentile !== undefined
      ? `${submission.stats.memoryPercentile.toFixed(2)}%`
      : 'N/A';

  return pattern
    .replace('{zero-padded-id}', paddedNumber)
    .replace('{number}', rawNumber)
    .replace('{id}', rawNumber)
    .replace('{title}', title)
    .replace('{lang}', lang)
    .replace('{language}', lang)
    .replace('{difficulty}', difficulty)
    .replace('{slug}', slug)
    .replace('{runtime}', runtime)
    .replace('{memory}', memory)
    .replace('{runtimePercentile}', runtimePercentile)
    .replace('{memoryPercentile}', memoryPercentile)
    .trim();
}

