import { NextRequest, NextResponse } from 'next/server';
import { updateCallStatus } from '../store';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

// POST /api/v1/intercom/answer
// Called to answer, decline, or end an intercom call.
// Body: { call_id: string, action: 'answer' | 'decline' | 'end', duration_seconds?: number }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { call_id, action, duration_seconds } = body;

  if (!call_id || !action) {
    return NextResponse.json({ error: 'call_id and action are required' }, { status: 400, headers: CORS_HEADERS });
  }

  const now = new Date().toISOString();
  let updated = false;

  if (action === 'answer') {
    updated = updateCallStatus(call_id, 'active', { answered_at: now });
  } else if (action === 'decline') {
    updated = updateCallStatus(call_id, 'declined', { ended_at: now, duration_seconds: 0 });
  } else if (action === 'end') {
    const durSecs = duration_seconds !== undefined ? Number(duration_seconds) : undefined;
    updated = updateCallStatus(call_id, 'completed', { ended_at: now, duration_seconds: durSecs });
  }

  if (!updated) {
    return NextResponse.json({ error: 'call_id not found in active queue' }, { status: 404, headers: CORS_HEADERS });
  }

  return NextResponse.json(
    { success: true, call_id, action, timestamp: now },
    { status: 200, headers: CORS_HEADERS }
  );
}
