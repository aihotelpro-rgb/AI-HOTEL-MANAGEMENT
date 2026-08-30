import { NextRequest, NextResponse } from 'next/server';
import { updateCallStatus, getCallQueue, IntercomCall } from '../store';

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
// Called by reception to answer or decline an incoming call
// Body: { call_id: string, action: 'answer' | 'decline' | 'end' }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { call_id, action } = body;

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
    // Find the call and calculate duration
    const call = getCallQueue().find((c: IntercomCall) => c.call_id === call_id);
    const startMs = call?.answered_at ? new Date(call.answered_at).getTime() : Date.now();
    const durSecs = Math.floor((Date.now() - startMs) / 1000);
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
