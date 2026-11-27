import type { ProblemDifficulty, CodingPlatform } from './problem.js';

export interface GitHubUser {
  login: string;
  id: number;
  avatarUrl: string;
  name?: string | null;
  htmlUrl: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  isPrivate: boolean;
  defaultBranch: string;
  permissions?: {
    admin?: boolean;
    push?: boolean;
    pull?: boolean;
  };
}

export interface SyncCommitPayload {
  owner: string;
  repo: string;
  branch: string;
  commitMessage: string;
  files: Array<{
    path: string;
    content: string;
  }>;
}

export interface SyncHistoryEntry {
  id: string;
  platform?: CodingPlatform;
  problemUrl?: string;
  submissionId: string;
  questionId?: string;
  questionFrontendId: string;
  questionTitle: string;
  questionSlug: string;
  difficulty?: ProblemDifficulty;
  lang: string;
  repo: string;
  branch: string;
  folderPath: string;
  solutionFilePath: string;
  readmeFilePath: string;
  commitSha?: string;
  commitUrl?: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  timestamp: number;
  runtimeMs?: number;
  runtimeDisplay?: string;
  memoryBytes?: number;
  memoryDisplay?: string;
  error?: string;
  /** Cached code only retained on FAILED entries to allow one-click retry */
  code?: string;
}

