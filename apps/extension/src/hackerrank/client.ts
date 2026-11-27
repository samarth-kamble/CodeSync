import type { ProblemDifficulty, ProblemMetadata, TopicTag } from '@leetsync/shared';

const HACKERRANK_CHALLENGE_API = 'https://www.hackerrank.com/rest/contests/master/challenges';

export function extractHackerRankSlugFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('hackerrank.com')) return null;
    const match = parsed.pathname.match(/\/challenges\/([^/]+)/);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

export function normalizeHackerRankDifficulty(raw?: string | null): ProblemDifficulty {
  const val = (raw || '').trim().toLowerCase();
  if (val === 'hard' || val === 'difficult' || val === 'expert') return 'Hard';
  if (val === 'medium') return 'Medium';
  return 'Easy';
}

export function normalizeHackerRankLanguage(rawLang?: string | null): string {
  const val = (rawLang || '').trim().toLowerCase();
  if (!val) return 'cpp';
  if (val === 'pypy3' || val.includes('python 3') || val === 'python3') return 'python3';
  if (val === 'pypy' || val.includes('python')) return 'python';
  if (val.includes('c++') || val.startsWith('cpp')) return 'cpp';
  if (val === 'c' || val === 'c_clang') return 'c';
  if ((val.includes('java') && !val.includes('javascript')) || /^java\d*$/.test(val)) return 'java';
  if (val.includes('javascript') || val === 'nodejs' || val === 'js') return 'javascript';
  if (val.includes('typescript') || val === 'ts') return 'typescript';
  if (val.includes('csharp') || val === 'c#') return 'csharp';
  if (val === 'go' || val.includes('golang')) return 'go';
  if (val.includes('kotlin')) return 'kotlin';
  if (val.includes('rust')) return 'rust';
  if (val.includes('swift')) return 'swift';
  if (val.includes('scala')) return 'scala';
  if (val.includes('ruby')) return 'ruby';
  if (val.includes('php')) return 'php';
  if (val.includes('mysql') || val.includes('oracle') || val.includes('postgres') || val.includes('tsql') || val === 'sql') {
    return 'mysql';
  }
  return val.replace(/[^a-z0-9]/g, '') || 'txt';
}

export interface HackerRankVerdictPayload {
  status?: string;
  status_code?: number;
  compile_status?: number;
  is_sample?: boolean;
  compile_test?: boolean;
  kind?: string;
  score?: number;
  is_accepted?: boolean;
  testcase_message?: string[];
}

/**
 * Strictly validates that a HackerRank judge response represents an Accepted full submission
 * (never a Run Code / compile_test or non-accepted verdict).
 */
export function isHackerRankAcceptedVerdict(data: HackerRankVerdictPayload): boolean {
  if (!data || typeof data !== 'object') return false;

  if (data.is_sample === true || data.compile_test === true) return false;
  if (data.kind && data.kind.toLowerCase() === 'compile_test') return false;

  const status = String(data.status || '').trim().toLowerCase();
  if (
    status.includes('wrong') ||
    status.includes('timeout') ||
    status.includes('time limit') ||
    status.includes('compilation error') ||
    status.includes('runtime error') ||
    status.includes('segmentation') ||
    status.includes('abort') ||
    status.includes('terminated')
  ) {
    return false;
  }

  if (status === 'accepted' || data.is_accepted === true) {
    return true;
  }

  return false;
}

interface HackerRankChallengeApiResponse {
  model?: {
    id?: number | string;
    name?: string;
    slug?: string;
    difficulty_name?: string;
    body_html?: string;
    preview?: string;
    track?: {
      name?: string;
      slug?: string;
    };
  };
}

export async function fetchHackerRankProblemMetadata(
  slug: string,
): Promise<ProblemMetadata | null> {
  const problemUrl = `https://www.hackerrank.com/challenges/${slug}/problem`;
  try {
    const res = await fetch(`${HACKERRANK_CHALLENGE_API}/${encodeURIComponent(slug)}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (res.ok) {
      const json = (await res.json()) as HackerRankChallengeApiResponse;
      const m = json.model;
      if (m) {
        const topicTags: TopicTag[] = m.track?.name
          ? [
              {
                name: m.track.name,
                slug: (m.track.slug || m.track.name).trim().toLowerCase().replace(/\s+/g, '-'),
              },
            ]
          : [];

        return {
          platform: 'hackerrank',
          problemUrl,
          questionId: String(m.id || slug),
          questionFrontendId: String(m.id || slug),
          title:
            m.name || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          titleSlug: m.slug || slug,
          difficulty: normalizeHackerRankDifficulty(m.difficulty_name),
          contentHtml: m.body_html || m.preview || '',
          topicTags,
        };
      }
    }
  } catch (err) {
    console.debug('[CodeSync HackerRank] API metadata fallback:', err);
  }

  const domTitle =
    typeof document !== 'undefined'
      ? document.querySelector('h1')?.textContent?.trim()
      : undefined;

  return {
    platform: 'hackerrank',
    problemUrl,
    questionId: slug,
    questionFrontendId: slug,
    title: domTitle || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    titleSlug: slug,
    difficulty: 'Easy',
    topicTags: [],
  };
}
