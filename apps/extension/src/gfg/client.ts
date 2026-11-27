import type { ProblemDifficulty, ProblemMetadata, TopicTag } from '@leetsync/shared';

const GFG_PROBLEM_API = 'https://practiceapi.geeksforgeeks.org/api/vr/problems';

export function extractGfgSlugFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('geeksforgeeks.org')) return null;
    const match = parsed.pathname.match(/\/problems\/([^/]+)/);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

export function normalizeGfgDifficulty(raw?: string | null): ProblemDifficulty {
  const val = (raw || '').trim().toLowerCase();
  if (val === 'hard') return 'Hard';
  if (val === 'medium') return 'Medium';
  // GFG also has School and Basic, which map to Easy
  return 'Easy';
}

export function normalizeGfgLanguage(rawLang?: string | null): string {
  const val = (rawLang || '').trim().toLowerCase();
  if (!val) return 'cpp';
  if (val.includes('python3') || val === 'py3') return 'python3';
  if (val.includes('python')) return 'python';
  if (val.includes('c++') || val === 'cpp') return 'cpp';
  if (val === 'c') return 'c';
  if (val.includes('java') && !val.includes('javascript')) return 'java';
  if (val.includes('javascript') || val === 'js') return 'javascript';
  if (val.includes('typescript') || val === 'ts') return 'typescript';
  if (val.includes('csharp') || val === 'c#') return 'csharp';
  if (val.includes('golang') || val === 'go') return 'go';
  if (val.includes('kotlin')) return 'kotlin';
  if (val.includes('rust')) return 'rust';
  if (val.includes('mysql') || val.includes('sql')) return 'mysql';
  return val.replace(/[^a-z0-9]/g, '') || 'txt';
}

export interface GfgVerdictPayload {
  status?: string;
  message?: string;
  user_solution_status?: string;
  correct?: boolean;
  is_correct?: boolean;
  error?: string | boolean | null;
  submission_type?: string;
  is_sample?: boolean;
}

/**
 * Strictly validates that a GFG judge response represents an Accepted full submission
 * (never a sample Run or non-accepted verdict).
 */
export function isGfgAcceptedVerdict(data: GfgVerdictPayload): boolean {
  if (!data || typeof data !== 'object') return false;

  // Reject sample/compile-only runs
  if (data.is_sample === true) return false;
  if (data.submission_type && data.submission_type.toLowerCase() === 'compile') return false;

  const msg = String(data.message || '').trim().toLowerCase();
  const solStatus = String(data.user_solution_status || '').trim().toLowerCase();

  // Reject explicit failure messages
  if (
    msg.includes('wrong') ||
    msg.includes('time limit') ||
    msg.includes('compilation error') ||
    msg.includes('runtime error') ||
    msg.includes('memory limit') ||
    msg.includes('incorrect')
  ) {
    return false;
  }

  if (msg.includes('problem solved successfully') || solStatus === 'correct') {
    return true;
  }

  if (data.correct === true || data.is_correct === true) {
    return true;
  }

  return false;
}

interface GfgProblemApiResponse {
  results?: {
    id?: number | string;
    problem_name?: string;
    slug?: string;
    difficulty?: string;
    problem_question?: string;
    tags?: {
      topic_tags?: string[];
    };
  };
}

export async function fetchGfgProblemMetadata(
  slug: string,
): Promise<ProblemMetadata | null> {
  const problemUrl = `https://www.geeksforgeeks.org/problems/${slug}/1`;
  try {
    const res = await fetch(`${GFG_PROBLEM_API}/${encodeURIComponent(slug)}/`, {
      method: 'GET',
      credentials: 'include',
    });

    if (res.ok) {
      const json = (await res.json()) as GfgProblemApiResponse;
      const r = json.results;
      if (r) {
        const topicTags: TopicTag[] = (r.tags?.topic_tags || []).map((name) => ({
          name,
          slug: name.trim().toLowerCase().replace(/\s+/g, '-'),
        }));

        return {
          platform: 'gfg',
          problemUrl,
          questionId: String(r.id || slug),
          questionFrontendId: String(r.id || ''),
          title: r.problem_name || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          titleSlug: r.slug || slug,
          difficulty: normalizeGfgDifficulty(r.difficulty),
          contentHtml: r.problem_question || '',
          topicTags,
        };
      }
    }
  } catch (err) {
    console.debug('[CodeSync GFG] API metadata fallback:', err);
  }

  // Fallback minimal metadata from slug/DOM
  const domTitle =
    typeof document !== 'undefined'
      ? document.querySelector('h3')?.textContent?.trim() || ''
      : '';

  return {
    platform: 'gfg',
    problemUrl,
    questionId: slug,
    questionFrontendId: '',
    title: domTitle || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    titleSlug: slug,
    difficulty: 'Easy',
    topicTags: [],
  };
}
