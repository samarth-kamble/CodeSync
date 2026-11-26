import type { GitHubUser } from './github.js';

export type OverwritePolicy = 'always' | 'improved' | 'never';

export interface UserPreferences {
  autoSync: boolean;
  overwritePolicy: OverwritePolicy;
  commitMessageFormat: string;
  folderNamingFormat: string;
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
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  autoSync: true,
  overwritePolicy: 'always',
  commitMessageFormat: 'feat(leetcode): solve {number} {title} | {lang} | {runtime}, {memory}',
  folderNamingFormat: '{zero-padded-id}-{slug}',
  enableNotifications: true,
};

export const DEFAULT_AUTH_STATE: AuthState = {
  isConnected: false,
  user: null,
  token: null,
  lastConnectedAt: null,
};

