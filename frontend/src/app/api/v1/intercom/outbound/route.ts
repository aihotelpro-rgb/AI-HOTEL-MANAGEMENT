import { NextRequest, NextResponse } from 'next/server';
import { getCallHistory, IntercomCall } from '../store';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

// POST /api/v1/intercom/outbound
// Called by Front Desk (reception) when they dial out to a room.
// This is an outbound call: Front Desk Ext 100 → Room Ext (e.g. 204)
// It logs directly to history (reception-to-room calls don't ring in the
// guest browser — they are logged as outbound call records).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const targetRoom = String(body.target_room || body.room_number || 'Unknown');
  const callId = `voip_outbound_${Date.now()}_to${targetRoom}`;
  const now = new Date().toISOString();

  const outboundCall: IntercomCall = {
    call_id: callId,
    from_room: '100',
    caller_name: 'Front Desk Reception (Ext 100)',
    from_extension: '100',
    target_extension: targetRoom,
    status: 'completed',
    started_at: now,
    answered_at: now,
    ended_at: now,
    duration_seconds: 0,
    hotel: 'Hotel Blue Bird Inn - Garacharma, Sri Vijayapuram',
  };

  // Push directly to history (outbound calls don't go through the ringing queue)
  const history = getCallHistory();
  history.unshift(outboundCall);
  // Cap at 50
  if (history.length > 50) history.splice(50);

  return NextResponse.json(
    {
      status: 'dialing',
      call_id: callId,
      message: `Front Desk dialing Room ${targetRoom} (Ext ${targetRoom})`,
      target_room: targetRoom,
    },
    { status: 200, headers: CORS_HEADERS }
  );
}
