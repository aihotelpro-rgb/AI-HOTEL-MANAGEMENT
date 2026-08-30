import { NextRequest, NextResponse } from 'next/server';
import { getRoomIncomingCalls, updateCallStatus } from '../store';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

// GET /api/v1/intercom/room-incoming?room=204
// Polled by the guest room browser every 3 seconds.
// Returns any active ringing incoming call from Front Desk for that room.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get('room') || '';

  if (!room) {
    return NextResponse.json({ error: 'room param required' }, { status: 400, headers: CORS_HEADERS });
  }

  const incoming = getRoomIncomingCalls(room);
  return NextResponse.json(incoming, { status: 200, headers: CORS_HEADERS });
}

// POST /api/v1/intercom/room-incoming
// Called by guest room browser to answer or decline a reception-initiated call.
// Body: { call_id: string, action: 'answer' | 'decline' | 'end' }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { call_id, action } = body;

  if (!call_id || !action) {
    return NextResponse.json({ error: 'call_id and action required' }, { status: 400, headers: CORS_HEADERS });
  }

  const now = new Date().toISOString();
  let updated = false;

  if (action === 'answer') {
    updated = updateCallStatus(call_id, 'active', { answered_at: now });
  } else if (action === 'decline') {
    updated = updateCallStatus(call_id, 'declined', { ended_at: now, duration_seconds: 0 });
  } else if (action === 'end') {
    updated = updateCallStatus(call_id, 'completed', { ended_at: now });
  }

  return NextResponse.json(
    { success: updated, call_id, action, timestamp: now },
    { status: updated ? 200 : 404, headers: CORS_HEADERS }
  );
}
