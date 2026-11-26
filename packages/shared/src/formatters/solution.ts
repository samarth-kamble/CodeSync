import type { SubmissionData } from '../types/submission.js';
import type { ProblemMetadata } from '../types/problem.js';
import { getLanguageDefinition } from '../constants/languages.js';

export type CommentSyntax = 'block' | 'hash' | 'dash';

export function getCommentSyntax(langSlug: string): CommentSyntax {
  const normalized = langSlug.toLowerCase().trim();
  if (['python', 'python3', 'ruby', 'r', 'elixir', 'pythondata'].includes(normalized)) {
    return 'hash';
  }
  if (['mysql', 'mssql', 'oraclesql', 'postgresql', 'sql'].includes(normalized)) {
    return 'dash';
  }
  return 'block';
}

/**
 * Generates a clean, aligned, language-specific comment header.
 */
export function generateSolutionHeader(
  submission: SubmissionData,
  problem?: ProblemMetadata | null,
): string {
  const langDef = getLanguageDefinition(submission.lang);
  const syntax = getCommentSyntax(submission.lang);

  const title = problem?.title || submission.questionTitle;
  const id = problem?.questionFrontendId || submission.questionFrontendId;
  const slug = problem?.titleSlug || submission.questionSlug;
  const difficulty = problem?.difficulty || 'Unknown';
  const problemUrl = `https://leetcode.com/problems/${slug}/`;
  const dateStr = new Date(submission.timestamp || Date.now()).toISOString().split('T')[0];

  const runtime =
    submission.stats?.runtimeDisplay ||
    (submission.stats?.runtimeMs !== undefined ? `${submission.stats.runtimeMs} ms` : null);
  const runtimePercentile =
    submission.stats?.runtimePercentile !== undefined
      ? ` (Beats ${submission.stats.runtimePercentile.toFixed(2)}%)`
      : '';
  const runtimeStr = runtime ? `${runtime}${runtimePercentile}` : 'N/A';

  const memory =
    submission.stats?.memoryDisplay ||
    (submission.stats?.memoryBytes !== undefined
      ? `${(submission.stats.memoryBytes / 1024 / 1024).toFixed(1)} MB`
      : null);
  const memoryPercentile =
    submission.stats?.memoryPercentile !== undefined
      ? ` (Beats ${submission.stats.memoryPercentile.toFixed(2)}%)`
      : '';
  const memoryStr = memory ? `${memory}${memoryPercentile}` : 'N/A';

  const lines = [
    `Problem  : ${id}. ${title}`,
    `Link     : ${problemUrl}`,
    `Diff     : ${difficulty}`,
    `Language : ${langDef.name}`,
    `Runtime  : ${runtimeStr}`,
    `Memory   : ${memoryStr}`,
    `Date     : ${dateStr}`,
    `Synced   : CodeSync`,
  ];

  if (syntax === 'hash') {
    return lines.map((l) => `# ${l}`).join('\n');
  }

  if (syntax === 'dash') {
    return lines.map((l) => `-- ${l}`).join('\n');
  }

  // Block comment
  return `/**\n${lines.map((l) => ` * ${l}`).join('\n')}\n */`;
}

/**
 * Prepend comment header to solution code.
 * If an existing CodeSync header is present, it cleanly strips the old header first.
 */
export function formatSolutionCode(
  rawCode: string,
  submission: SubmissionData,
  problem?: ProblemMetadata | null,
): string {
  const cleanCode = rawCode.trim();

  // Strip previous CodeSync header if present to prevent header duplication on re-sync
  const strippedCode = cleanCode
    .replace(/^\/\*\*[\s\S]*?(?:Synced with CodeSync|Synced\s*:\s*CodeSync)[\s\S]*?\*\/\s*/i, '')
    .replace(/^(?:#[^\n]*\n)*?# (?:Synced with CodeSync|Synced\s*:\s*CodeSync)\s*/i, '')
    .replace(/^(?:--[^\n]*\n)*?-- (?:Synced with CodeSync|Synced\s*:\s*CodeSync)\s*/i, '')
    .trim();

  const header = generateSolutionHeader(submission, problem);

  return `${header}\n\n${strippedCode}\n`;
}
