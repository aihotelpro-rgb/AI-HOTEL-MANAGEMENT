import { NextRequest, NextResponse } from 'next/server';
import { addCallToQueue, getCallQueue, expireRingingCalls, IntercomCall } from '../store';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

// POST /api/v1/intercom/call
// Called by guest room browser when they tap "Call Reception"
// Adds call to the server-side queue — reception polls this queue
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  expireRingingCalls();

  const fromRoom = String(body.room_number || body.from_extension || 'Unknown');
  const callId = `voip_${Date.now()}_room${fromRoom}`;

  const newCall: IntercomCall = {
    call_id: callId,
    from_room: fromRoom,
    caller_name: body.caller_name || `Room ${fromRoom} Guest`,
    from_extension: fromRoom,
    target_extension: '100',
    status: 'ringing',
    started_at: new Date().toISOString(),
    hotel: 'Hotel Blue Bird Inn - Garacharma, Sri Vijayapuram',
  };

  addCallToQueue(newCall);

  return NextResponse.json(
    {
      status: 'ringing',
      call_id: callId,
      message: `Ringing Front Desk (Ext 100) from Room ${fromRoom}`,
      from_room: fromRoom,
      queue_position: getCallQueue().length,
    },
    { status: 200, headers: CORS_HEADERS }
  );
}

// GET /api/v1/intercom/call
// Returns current active ringing call queue (used by reception to poll)
export async function GET() {
  expireRingingCalls();
  const queue = getCallQueue();
  return NextResponse.json(queue, { status: 200, headers: CORS_HEADERS });
}
