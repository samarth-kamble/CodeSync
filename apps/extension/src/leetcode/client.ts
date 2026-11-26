import type { ProblemMetadata, ProblemDifficulty, TopicTag } from '@leetsync/shared';

const LEETCODE_GRAPHQL_ENDPOINT = 'https://leetcode.com/graphql';

const QUESTION_DATA_QUERY = `
query getQuestionDetail($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionId
    questionFrontendId
    title
    titleSlug
    difficulty
    content
    topicTags {
      name
      slug
      translatedName
    }
  }
}
`;

export function extractProblemSlugFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/problems\/([^/]+)/);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

interface GraphQLQuestionResponse {
  data?: {
    question?: {
      questionId: string;
      questionFrontendId: string;
      title: string;
      titleSlug: string;
      difficulty: string;
      content?: string;
      topicTags?: Array<{
        name: string;
        slug: string;
        translatedName?: string | null;
      }>;
    } | null;
  };
  errors?: Array<{ message: string }>;
}

export async function fetchProblemMetadata(
  titleSlug: string,
): Promise<ProblemMetadata | null> {
  try {
    const response = await fetch(LEETCODE_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: QUESTION_DATA_QUERY,
        variables: { titleSlug },
      }),
    });

    if (!response.ok) {
      console.warn(`[CodeSync] LeetCode GraphQL returned status ${response.status}`);
      return null;
    }

    const json = (await response.json()) as GraphQLQuestionResponse;
    const question = json.data?.question;

    if (!question) {
      console.warn(`[CodeSync] No question details returned for slug: ${titleSlug}`);
      return null;
    }

    const difficulty: ProblemDifficulty =
      question.difficulty === 'Hard'
        ? 'Hard'
        : question.difficulty === 'Medium'
          ? 'Medium'
          : 'Easy';

    const topicTags: TopicTag[] = (question.topicTags || []).map((t) => ({
      name: t.name,
      slug: t.slug,
      translatedName: t.translatedName ?? null,
    }));

    return {
      questionId: question.questionId,
      questionFrontendId: question.questionFrontendId,
      title: question.title,
      titleSlug: question.titleSlug,
      difficulty,
      contentHtml: question.content,
      topicTags,
    };
  } catch (error) {
    console.error('[CodeSync] Error querying LeetCode GraphQL:', error);
    return null;
  }
}

const SUBMISSION_DETAILS_QUERY = `
query submissionDetails($submissionId: Int!) {
  submissionDetails(submissionId: $submissionId) {
    statusCode
    code
    lang {
      name
    }
    runtimeDisplay
    runtimePercentile
    memoryDisplay
    memoryPercentile
  }
}
`;

function getCsrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export async function fetchSubmissionBenchmarks(submissionId: string): Promise<{
  statusCode?: number;
  code?: string;
  langSlug?: string;
  runtimeDisplay?: string;
  runtimePercentile?: number;
  memoryDisplay?: string;
  memoryPercentile?: number;
} | null> {
  const numericId = parseInt(submissionId, 10);
  if (isNaN(numericId)) return null;

  try {
    const csrfToken = getCsrfToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (csrfToken) {
      headers['x-csrftoken'] = csrfToken;
    }

    const response = await fetch(LEETCODE_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        query: SUBMISSION_DETAILS_QUERY,
        variables: { submissionId: numericId },
      }),
    });

    if (!response.ok) return null;
    const json = await response.json() as {
      data?: {
        submissionDetails?: {
          statusCode?: number;
          code?: string;
          lang?: { name?: string };
          runtimeDisplay?: string;
          runtimePercentile?: number;
          memoryDisplay?: string;
          memoryPercentile?: number;
        } | null;
      };
    };

    const details = json.data?.submissionDetails;
    if (!details) return null;

    return {
      statusCode: typeof details.statusCode === 'number' ? details.statusCode : undefined,
      code: details.code || undefined,
      langSlug: details.lang?.name || undefined,
      runtimeDisplay: details.runtimeDisplay || undefined,
      runtimePercentile: typeof details.runtimePercentile === 'number' ? details.runtimePercentile : undefined,
      memoryDisplay: details.memoryDisplay || undefined,
      memoryPercentile: typeof details.memoryPercentile === 'number' ? details.memoryPercentile : undefined,
    };
  } catch {
    return null;
  }
}

