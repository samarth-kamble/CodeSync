import type { ProblemMetadata, ProblemDifficulty } from '../types/problem.js';
import type { SubmissionData } from '../types/submission.js';
import { convertHtmlToMarkdown } from './html-to-md.js';
import { getLanguageDefinition } from '../constants/languages.js';
import { getProblemUrl } from './paths.js';

export function getDifficultyShieldBadge(difficulty: ProblemDifficulty): string {
  switch (difficulty) {
    case 'Easy':
      return 'https://img.shields.io/badge/Difficulty-Easy-brightgreen';
    case 'Medium':
      return 'https://img.shields.io/badge/Difficulty-Medium-orange';
    case 'Hard':
      return 'https://img.shields.io/badge/Difficulty-Hard-red';
    default:
      return 'https://img.shields.io/badge/Difficulty-Unknown-lightgrey';
  }
}

/**
 * Generates the full problem README.md file content.
 */
export function generateProblemReadme(
  problem: ProblemMetadata,
  submission?: SubmissionData | null,
): string {
  const parts: string[] = [];

  // 1. Title & problem link
  const platform = problem.platform || submission?.platform || 'leetcode';
  const problemUrl = getProblemUrl(
    problem.titleSlug,
    platform,
    problem.problemUrl || submission?.problemUrl,
  );
  const headingLabel = problem.questionFrontendId
    ? `${problem.questionFrontendId}. ${problem.title}`
    : problem.title;
  parts.push(`# [${headingLabel}](${problemUrl})`);
  parts.push('');

  // 2. Difficulty Badge
  const badgeUrl = getDifficultyShieldBadge(problem.difficulty);
  parts.push(`![Difficulty: ${problem.difficulty}](${badgeUrl})`);
  parts.push('');

  // 3. Topic Tags
  if (problem.topicTags && problem.topicTags.length > 0) {
    const tags = problem.topicTags.map((t) => `\`${t.name}\``).join(' ');
    parts.push(`**Topic Tags:** ${tags}`);
    parts.push('');
  }

  // 4. Problem Description
  parts.push('---');
  parts.push('');
  parts.push('## Problem Statement');
  parts.push('');

  if (problem.contentHtml) {
    const markdownContent = convertHtmlToMarkdown(problem.contentHtml);
    parts.push(markdownContent);
  } else if (problem.descriptionMarkdown) {
    parts.push(problem.descriptionMarkdown.trim());
  } else {
    parts.push('*No description available.*');
  }

  parts.push('');

  // 5. Benchmark & Submission performance stats
  if (submission && submission.stats) {
    const langDef = getLanguageDefinition(submission.lang);
    parts.push('---');
    parts.push('');
    parts.push('## Submissions & Benchmarks');
    parts.push('');
    parts.push('| Metric | Result | Benchmark |');
    parts.push('| :--- | :--- | :--- |');

    const runtimeVal = submission.stats.runtimeDisplay || (submission.stats.runtimeMs !== undefined ? `${submission.stats.runtimeMs} ms` : 'N/A');
    const runtimeBeat = submission.stats.runtimePercentile !== undefined ? `Beats ${submission.stats.runtimePercentile.toFixed(2)}% of ${langDef.name} submissions` : '—';
    parts.push(`| **Runtime** | \`${runtimeVal}\` | ${runtimeBeat} |`);

    const memoryVal = submission.stats.memoryDisplay || (submission.stats.memoryBytes !== undefined ? `${(submission.stats.memoryBytes / 1024 / 1024).toFixed(1)} MB` : 'N/A');
    const memoryBeat = submission.stats.memoryPercentile !== undefined ? `Beats ${submission.stats.memoryPercentile.toFixed(2)}% of ${langDef.name} submissions` : '—';
    parts.push(`| **Memory** | \`${memoryVal}\` | ${memoryBeat} |`);

    parts.push(`| **Language** | \`${langDef.name}\` | — |`);
    parts.push('');
  }

  // 6. Attribution Footer
  parts.push('---');
  parts.push('*Synchronized automatically with CodeSync.*');
  parts.push('');

  return parts.join('\n');
}

