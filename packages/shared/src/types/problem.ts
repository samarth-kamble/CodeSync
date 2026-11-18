export type ProblemDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface TopicTag {
  name: string;
  slug: string;
  translatedName?: string | null;
}

export interface ProblemMetadata {
  questionId: string;
  questionFrontendId: string;
  title: string;
  titleSlug: string;
  difficulty: ProblemDifficulty;
  contentHtml?: string;
  descriptionMarkdown?: string;
  topicTags: TopicTag[];
  codeSnippets?: Array<{
    lang: string;
    langSlug: string;
    code: string;
  }>;
}

