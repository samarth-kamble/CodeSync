import type { SyncHistoryEntry } from '../types/github.js';
import { getLanguageDefinition } from '../constants/languages.js';

/**
 * Generates a root repository README.md summarizing solved LeetCode problems
 * with Easy/Medium/Hard counts and a sorted progress table.
 */
export function generateRootReadme(
  history: SyncHistoryEntry[],
  repoFullName?: string,
): string {
  // Keep only successful syncs and deduplicate by problem ID (latest wins)
  const byProblem = new Map<string, SyncHistoryEntry>();
  for (const entry of history) {
    if (entry.status !== 'SUCCESS') continue;
    const key = entry.questionFrontendId || entry.questionSlug;
    const existing = byProblem.get(key);
    if (!existing || entry.timestamp > existing.timestamp) {
      byProblem.set(key, entry);
    }
  }

  const solved = Array.from(byProblem.values()).sort((a, b) => {
    const numA = parseInt(a.questionFrontendId, 10);
    const numB = parseInt(b.questionFrontendId, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.questionFrontendId.localeCompare(b.questionFrontendId);
  });

  let easy = 0;
  let medium = 0;
  let hard = 0;
  for (const item of solved) {
    if (item.difficulty === 'Easy') easy++;
    else if (item.difficulty === 'Medium') medium++;
    else if (item.difficulty === 'Hard') hard++;
  }

  const lines: string[] = [];
  const title = repoFullName ? `# ${repoFullName} — LeetCode Solutions` : '# LeetCode Solutions';
  lines.push(title);
  lines.push('');
  lines.push(
    'Collection of LeetCode solutions automatically synchronized via **CodeSync**.',
  );
  lines.push('');

  // Progress Badges
  lines.push(
    `![Total Solved](https://img.shields.io/badge/Total%20Solved-${solved.length}-blue) ` +
      `![Easy](https://img.shields.io/badge/Easy-${easy}-brightgreen) ` +
      `![Medium](https://img.shields.io/badge/Medium-${medium}-orange) ` +
      `![Hard](https://img.shields.io/badge/Hard-${hard}-red)`,
  );
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Solved Problems');
  lines.push('');
  lines.push('| # | Problem | Difficulty | Language | Runtime | Memory | Solution |');
  lines.push('| :---: | :--- | :---: | :---: | :---: | :---: | :---: |');

  for (const item of solved) {
    const num = item.questionFrontendId;
    const problemLink = `[${item.questionTitle}](https://leetcode.com/problems/${item.questionSlug}/)`;
    const diff = item.difficulty || '—';
    const langName = getLanguageDefinition(item.lang).name;
    const runtime = item.runtimeDisplay || (item.runtimeMs !== undefined ? `${item.runtimeMs} ms` : '—');
    const memory = item.memoryDisplay || '—';
    const solutionLink = `[Code](./${item.solutionFilePath})`;

    lines.push(`| ${num} | ${problemLink} | ${diff} | ${langName} | ${runtime} | ${memory} | ${solutionLink} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('*Maintained automatically by CodeSync.*');
  lines.push('');

  return lines.join('\n');
}
