import type { GitHubUser } from './github.js';
import type { SubmissionData } from './submission.js';

export type OverwritePolicy = 'always' | 'improved' | 'never';

export type FolderOrganization =
  | 'flat'
  | 'topic'
  | 'difficulty'
  | 'language'
  | 'platform'
  | 'platform-topic'
  | 'platform-difficulty';

export type SolutionNamingStyle = 'slug' | 'solution' | 'numbered';

export interface UserPreferences {
  autoSync: boolean;
  askFolderBeforeSync?: boolean;
  overwritePolicy: OverwritePolicy;
  commitMessageFormat: string;
  folderNamingFormat: string;
  folderOrganization?: FolderOrganization;
  solutionNamingStyle?: SolutionNamingStyle;
  updateRootReadme?: boolean;
  enableNotifications?: boolean;
}

export interface SelectedRepository {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  isPrivate: boolean;
  defaultBranch: string;
  targetBranch: string;
}

export interface AuthState {
  isConnected: boolean;
  user: GitHubUser | null;
  token?: string | null;
  lastConnectedAt?: number | null;
  sessionExpired?: boolean;
  authError?: string;
}

export interface RetryQueueItem {
  id: string;
  submission: SubmissionData;
  overrides?: {
    customParentFolder?: string;
    customCommitMessage?: string;
  };
  attempts: number;
  nextRetryAt: number;
  lastError: string;
  createdAt: number;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  autoSync: true,
  askFolderBeforeSync: false,
  overwritePolicy: 'always',
  commitMessageFormat: 'Time: {runtime} ({runtimePercentile}) | Memory: {memory} ({memoryPercentile}) - CodeSync',
  folderNamingFormat: '{zero-padded-id}-{slug}',
  folderOrganization: 'platform',
  solutionNamingStyle: 'slug',
  updateRootReadme: true,
  enableNotifications: true,
};

export const DEFAULT_AUTH_STATE: AuthState = {
  isConnected: false,
  user: null,
  token: null,
  lastConnectedAt: null,
  sessionExpired: false,
};

