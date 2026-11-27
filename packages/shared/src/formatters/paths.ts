import { getLanguageDefinition } from '../constants/languages.js';
import type { CodingPlatform, ProblemDifficulty, TopicTag } from '../types/problem.js';
import type { FolderOrganization, SolutionNamingStyle } from '../types/settings.js';

export type { SolutionNamingStyle };

const SQL_LANG_SLUGS = new Set(['mysql', 'mssql', 'oraclesql', 'postgresql', 'sql']);

/**
 * Deterministic priority order for multi-tag LeetCode problems when organizing by topic.
 * Specific algorithmic/data-structure tags take precedence over broad tags like array/math.
 */
const TOPIC_PRIORITY: string[] = [
  'database',
  'dynamic-programming',
  'backtracking',
  'divide-and-conquer',
  'greedy',
  'graph',
  'breadth-first-search',
  'depth-first-search',
  'topological-sort',
  'union-find',
  'shortest-path',
  'tree',
  'binary-tree',
  'binary-search-tree',
  'trie',
  'linked-list',
  'binary-search',
  'sliding-window',
  'two-pointers',
  'stack',
  'monotonic-stack',
  'queue',
  'heap-priority-queue',
  'hash-table',
  'bit-manipulation',
  'recursion',
  'matrix',
  'string',
  'array',
  'sorting',
  'math',
];

/**
 * Strips characters that are illegal across Unix, Windows, and macOS filesystems.
 */
export function sanitizePathComponent(name: string): string {
  return name
    .trim()
    .replace(/[<>:"/\\|?*.\x00-\x1F]/g, '-') // Replace invalid filename chars and dots
    .replace(/\s+/g, '-')                    // Replace whitespace with hyphens
    .replace(/-+/g, '-')                     // Collapse multiple hyphens
    .replace(/^[-]+|[-]+$/g, '')             // Strip leading/trailing hyphens
    .toLowerCase();
}

/**
 * Left-pads problem number to standard length (e.g., 1 -> 0001, 704 -> 0704).
 * If the number exceeds the padding length (e.g. 10423), it is preserved as-is.
 */
export function padProblemNumber(frontendQuestionId: string | number, padLength: number = 4): string {
  const str = String(frontendQuestionId).trim();
  const num = parseInt(str, 10);
  if (isNaN(num)) {
    return str;
  }
  return str.padStart(padLength, '0');
}

export interface FolderOrganizationOptions {
  organization?: FolderOrganization;
  platform?: CodingPlatform;
  langSlug?: string;
  difficulty?: ProblemDifficulty;
  topicTags?: TopicTag[];
  /** Explicit parent folder chosen by the user in the interactive dialog ('' = root) */
  customParentFolder?: string;
}

/**
 * Resolves the canonical problem URL for a given coding platform.
 */
export function getProblemUrl(
  slug: string,
  platform: CodingPlatform = 'leetcode',
  customUrl?: string,
): string {
  if (customUrl) return customUrl;
  switch (platform) {
    case 'gfg':
      return `https://www.geeksforgeeks.org/problems/${slug}/1`;
    case 'codechef':
      return `https://www.codechef.com/problems/${slug}`;
    case 'leetcode':
    default:
      return `https://leetcode.com/problems/${slug}/`;
  }
}

/**
 * Resolves the primary topic subfolder using deterministic priority.
 * SQL languages or the 'database' tag map cleanly to 'sql'.
 */
export function resolvePrimaryTopicFolder(langSlug?: string, topicTags?: TopicTag[]): string {
  if (langSlug && SQL_LANG_SLUGS.has(langSlug.trim().toLowerCase())) {
    return 'sql';
  }

  const tags = topicTags || [];
  const slugs = new Set(tags.map((t) => t.slug.toLowerCase()));

  if (slugs.has('database')) {
    return 'sql';
  }

  for (const preferred of TOPIC_PRIORITY) {
    if (slugs.has(preferred)) {
      return sanitizePathComponent(preferred);
    }
  }

  if (tags.length > 0 && tags[0].slug) {
    return sanitizePathComponent(tags[0].slug);
  }

  return 'uncategorized';
}

/**
 * Resolves the optional parent category folder based on the selected organization mode.
 */
export function resolveCategorySubfolder(options?: FolderOrganizationOptions): string {
  const mode = options?.organization || 'flat';

  switch (mode) {
    case 'topic':
      return resolvePrimaryTopicFolder(options?.langSlug, options?.topicTags);
    case 'difficulty':
      return options?.difficulty ? sanitizePathComponent(options.difficulty) : 'unknown';
    case 'language': {
      const lang = (options?.langSlug || '').trim().toLowerCase();
      if (!lang) return 'other';
      return SQL_LANG_SLUGS.has(lang) ? 'sql' : sanitizePathComponent(lang);
    }
    case 'platform':
      return options?.platform ? sanitizePathComponent(options.platform) : 'leetcode';
    case 'platform-topic': {
      const plat = options?.platform ? sanitizePathComponent(options.platform) : 'leetcode';
      const topic = resolvePrimaryTopicFolder(options?.langSlug, options?.topicTags);
      return `${plat}/${topic}`;
    }
    case 'platform-difficulty': {
      const plat = options?.platform ? sanitizePathComponent(options.platform) : 'leetcode';
      const diff = options?.difficulty ? sanitizePathComponent(options.difficulty) : 'unknown';
      return `${plat}/${diff}`;
    }
    case 'flat':
    default:
      return '';
  }
}

/**
 * Generates the standardized problem directory path.
 * Examples:
 * - flat: '0704-binary-search'
 * - topic: 'dynamic-programming/0198-house-robber', 'sql/0175-combine-two-tables'
 * - difficulty: 'easy/0704-binary-search'
 * - language: 'python3/0704-binary-search'
 */
export function getProblemFolderPath(
  frontendQuestionId: string | number,
  titleSlug: string,
  formatPattern: string = '{zero-padded-id}-{slug}',
  organizationOptions?: FolderOrganizationOptions,
): string {
  const paddedId = padProblemNumber(frontendQuestionId);
  const rawId = String(frontendQuestionId).trim();
  const cleanSlug = sanitizePathComponent(titleSlug);

  let folder = formatPattern
    .replace('{zero-padded-id}', paddedId)
    .replace('{id}', rawId)
    .replace('{number}', rawId)
    .replace('{slug}', cleanSlug);

  // Fallback if pattern didn't match anything
  if (!folder || folder === formatPattern) {
    folder = `${paddedId}-${cleanSlug}`;
  }

  const sanitizedFolder = sanitizePathComponent(folder);

  if (organizationOptions?.customParentFolder !== undefined) {
    const cleanCustomParent = organizationOptions.customParentFolder
      .split('/')
      .map((seg) => sanitizePathComponent(seg))
      .filter(Boolean)
      .join('/');
    return cleanCustomParent ? `${cleanCustomParent}/${sanitizedFolder}` : sanitizedFolder;
  }

  const category = resolveCategorySubfolder(organizationOptions);

  return category ? `${category}/${sanitizedFolder}` : sanitizedFolder;
}

/**
 * Returns the canonical file extension for a given language.
 */
export function getLanguageFileExtension(langSlug: string): string {
  return getLanguageDefinition(langSlug).extension;
}

/**
 * Generates the solution filename.
 * Examples:
 * - 'slug': 'binary-search.py'
 * - 'solution': 'solution.py'
 * - 'numbered': '0704-binary-search.py'
 */
export function getSolutionFilename(
  titleSlug: string,
  langSlug: string,
  style: SolutionNamingStyle = 'slug',
  frontendQuestionId?: string | number,
): string {
  const ext = getLanguageFileExtension(langSlug);
  const cleanSlug = sanitizePathComponent(titleSlug);

  switch (style) {
    case 'solution':
      return `solution.${ext}`;
    case 'numbered': {
      const paddedId = frontendQuestionId ? padProblemNumber(frontendQuestionId) : '';
      return paddedId ? `${paddedId}-${cleanSlug}.${ext}` : `${cleanSlug}.${ext}`;
    }
    case 'slug':
    default:
      return `${cleanSlug}.${ext}`;
  }
}
