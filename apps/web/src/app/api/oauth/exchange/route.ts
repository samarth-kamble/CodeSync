import { NextRequest, NextResponse } from 'next/server';
import { exchangeGitHubCodeAction } from '@/actions/auth-actions';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, redirectUri } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Missing required parameter: code' },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const result = await exchangeGitHubCodeAction(code, redirectUri);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          message: result.message,
        },
        { status: result.error === 'Configuration Missing' ? 500 : 400, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json(
      {
        access_token: result.accessToken,
        token_type: result.tokenType,
        scope: result.scope,
      },
      { status: 200, headers: CORS_HEADERS },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json(
      { error: 'OAuth Exchange Failed', details: message },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
