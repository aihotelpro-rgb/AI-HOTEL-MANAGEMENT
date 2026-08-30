import { NextRequest, NextResponse } from 'next/server';
import { addRoomIncomingCall, IntercomCall } from '../store';

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
// Called by Front Desk when dialing out to a room.
// Adds call to the per-room incoming queue with status 'ringing'.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const targetRoom = String(body.target_room || body.room_number || 'Unknown');
  const callId = `voip_out_${Date.now()}_to${targetRoom}`;
  const now = new Date().toISOString();

  const outboundCall: IntercomCall = {
    call_id: callId,
    from_room: '100',
    caller_name: 'Front Desk Reception (Ext 100)',
    from_extension: '100',
    target_extension: targetRoom,
    status: 'ringing',
    started_at: now,
    hotel: 'Hotel Blue Bird Inn - Garacharma, Sri Vijayapuram',
  };

  // Add to room-facing incoming queue (room browser polls /room-incoming?room=XX)
  addRoomIncomingCall(outboundCall);

  return NextResponse.json(
    {
      status: 'ringing',
      call_id: callId,
      message: `Front Desk ringing Room ${targetRoom} (Ext ${targetRoom})`,
      target_room: targetRoom,
    },
    { status: 200, headers: CORS_HEADERS }
  );
}
