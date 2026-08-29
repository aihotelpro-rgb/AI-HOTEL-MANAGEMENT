import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const targetRoom = body.room_number || body.extension || '100';

  return NextResponse.json(
    {
      status: "connected",
      call_id: `voip_call_${Date.now()}`,
      target_room: targetRoom,
      from_extension: body.from_extension || "Guest App",
      audio_channel: "WebRTC / SIP Active",
      hotel: "Hotel Blue Bird Inn - Garacharma, Sri Vijayapuram",
      timestamp: new Date().toISOString()
    },
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}
