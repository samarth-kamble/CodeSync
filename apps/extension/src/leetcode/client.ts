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

