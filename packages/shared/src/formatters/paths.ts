import { getLanguageDefinition } from '../constants/languages.js';

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

export type SolutionNamingStyle = 'slug' | 'solution' | 'numbered';

/**
 * Generates the standardized problem directory name.
 * e.g. '0704-binary-search' or '0001-two-sum'
 */
export function getProblemFolderPath(
  frontendQuestionId: string | number,
  titleSlug: string,
  formatPattern: string = '{zero-padded-id}-{slug}',
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

  return sanitizePathComponent(folder);
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
