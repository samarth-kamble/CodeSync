import {
  type AuthState,
  type GitHubUser,
  DEFAULT_AUTH_STATE,
} from '@leetsync/shared';
import { setStorageItem } from '../storage';

const ENV_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
const ENV_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || '';

export function getRedirectUri(): string {
  if (typeof chrome !== 'undefined' && chrome.identity?.getRedirectURL) {
    return chrome.identity.getRedirectURL();
  }
  return `${ENV_BACKEND_URL}/auth/callback`;
}

/**
 * Validates a GitHub Access Token by fetching the user's public profile.
 */
export async function fetchGitHubProfile(token: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'CodeSync-Extension',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    login: data.login,
    name: data.name ?? null,
    avatarUrl: data.avatar_url,
    htmlUrl: data.html_url,
  };
}

/**
 * Initiates the standard Chrome Extension OAuth flow via chrome.identity.launchWebAuthFlow
 */
export async function initiateGitHubOAuth(
  backendUrl: string = ENV_BACKEND_URL,
  clientId: string = ENV_CLIENT_ID,
): Promise<AuthState> {
  if (!clientId) {
    throw new Error(
      'VITE_GITHUB_CLIENT_ID is not configured. Please set it in apps/extension/.env.local',
    );
  }

  if (typeof chrome === 'undefined' || !chrome.identity?.launchWebAuthFlow) {
    throw new Error('Chrome Identity API is not available in this environment.');
  }

  const redirectUri = getRedirectUri();
  const state = Math.random().toString(36).substring(2) + Date.now().toString(36);

  const authUrl =
    `https://github.com/login/oauth/authorize?` +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'repo',
      state,
    }).toString();

  console.log('[CodeSync] Launching WebAuthFlow to:', authUrl);

  const responseUrl = await new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl,
        interactive: true,
      },
      (callbackUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!callbackUrl) {
          reject(new Error('Authentication was cancelled or failed to return a callback URL.'));
        } else {
          resolve(callbackUrl);
        }
      },
    );
  });

  const parsedUrl = new URL(responseUrl);
  const returnedCode = parsedUrl.searchParams.get('code');
  const returnedState = parsedUrl.searchParams.get('state');

  if (!returnedCode) {
    throw new Error('No authorization code returned from GitHub.');
  }

  if (returnedState !== state) {
    throw new Error('CSRF State verification failed: state mismatch.');
  }

  console.log(`[CodeSync] Exchanging authorization code with backend at ${backendUrl}...`);

  const exchangeResponse = await fetch(`${backendUrl}/api/oauth/exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: returnedCode,
      redirectUri,
    }),
  });

  const exchangeData = await exchangeResponse.json();

  if (!exchangeResponse.ok || !exchangeData.access_token) {
    throw new Error(
      exchangeData.message || exchangeData.error_description || exchangeData.error || 'Token exchange failed',
    );
  }

  console.log('[CodeSync] Token exchange successful. Fetching GitHub profile...');
  const user = await fetchGitHubProfile(exchangeData.access_token);

  const authState: AuthState = {
    isConnected: true,
    user,
    token: exchangeData.access_token,
    lastConnectedAt: Date.now(),
    sessionExpired: false,
  };

  await setStorageItem('auth', authState);
  console.log(`[CodeSync] Successfully connected as GitHub user: @${user.login}`);

  return authState;
}

/**
 * Connects directly using a Personal Access Token (for instant testing or offline server setup)
 */
export async function connectWithToken(token: string): Promise<AuthState> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    throw new Error('Token cannot be empty');
  }

  const user = await fetchGitHubProfile(cleanToken);

  const authState: AuthState = {
    isConnected: true,
    user,
    token: cleanToken,
    lastConnectedAt: Date.now(),
    sessionExpired: false,
  };

  await setStorageItem('auth', authState);
  return authState;
}

/**
 * Disconnects the GitHub account from CodeSync
 */
export async function disconnectGitHubAccount(): Promise<void> {
  await setStorageItem('auth', DEFAULT_AUTH_STATE);
  await setStorageItem('selectedRepo', null);
  console.log('[CodeSync] GitHub account disconnected.');
}
