import { NextRequest, NextResponse } from 'next/server';
import { getCallHistory, expireRingingCalls } from '../store';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

// GET /api/v1/intercom/history
// Returns call history (completed, missed, declined calls)
export async function GET() {
  expireRingingCalls();
  const history = getCallHistory();
  return NextResponse.json(history, { status: 200, headers: CORS_HEADERS });
}

export async function POST() {
  expireRingingCalls();
  const history = getCallHistory();
  return NextResponse.json(history, { status: 200, headers: CORS_HEADERS });
}
