'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

/**
 * Server Action to check the current user's session status.
 */
export async function getAuthSessionAction() {
  try {
    const currentHeaders = await headers();
    const session = await auth.api.getSession({
      headers: currentHeaders,
    });
    return { success: true, session };
  } catch (error) {
    console.error('[CodeSync Action] Failed to retrieve session:', error);
    return { success: false, session: null, error: 'Failed to retrieve session' };
  }
}

/**
 * Server Action to check if all required GitHub OAuth and Better Auth keys are configured.
 */
export async function verifyAuthConfigurationAction() {
  const hasClientId = Boolean(process.env.GITHUB_CLIENT_ID);
  const hasClientSecret = Boolean(process.env.GITHUB_CLIENT_SECRET);
  const hasAuthSecret = Boolean(process.env.BETTER_AUTH_SECRET);
  const authUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';

  return {
    configured: hasClientId && hasClientSecret && hasAuthSecret,
    details: {
      hasClientId,
      hasClientSecret,
      hasAuthSecret,
      authUrl,
    },
  };
}

/**
 * Server Action to securely exchange GitHub authorization code for an access token.
 */
export async function exchangeGitHubCodeAction(code: string, redirectUri?: string) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      success: false,
      error: 'Configuration Missing',
      message: 'GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are not configured on the server.',
    };
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await tokenResponse.json();

    if (data.error) {
      return {
        success: false,
        error: data.error,
        message: data.error_description || 'GitHub OAuth token exchange failed',
      };
    }

    return {
      success: true,
      accessToken: data.access_token as string,
      tokenType: (data.token_type || 'bearer') as string,
      scope: data.scope as string,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return {
      success: false,
      error: 'Exchange Failed',
      message,
    };
  }
}

