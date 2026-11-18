import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'codesync-web-api',
    timestamp: new Date().toISOString(),
  });
}

