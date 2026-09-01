import { NextRequest, NextResponse } from 'next/server';
import { getRoomsByProperty } from '@/lib/roomsStore';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function PUT(req: NextRequest, { params }: { params: { room: string } }) {
  try {
    const roomNumber = params.room;
    const body = await req.json();
    const { status } = body;

    const allRooms = getRoomsByProperty(0);
    const room = allRooms.find(r => r.room_number === roomNumber);

    if (room) {
      room.status = status;
    }

    return NextResponse.json({
      room_number: roomNumber,
      status: status,
      updated_at: new Date().toISOString(),
      message: `Suite ${roomNumber} status successfully updated to ${status}`
    }, { headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update room status" }, { status: 400, headers: corsHeaders });
  }
}
