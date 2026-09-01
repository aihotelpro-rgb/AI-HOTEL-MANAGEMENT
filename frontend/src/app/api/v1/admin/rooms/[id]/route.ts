import { NextRequest, NextResponse } from 'next/server';
import { ROOMS_DATA } from '@/lib/roomsStore';

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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const roomId = parseInt(params.id, 10);
    const body = await req.json();

    const roomIndex = ROOMS_DATA.findIndex(r => r.id === roomId);
    if (roomIndex === -1) {
      return NextResponse.json({ detail: 'Suite not found' }, { status: 404 });
    }

    const room = ROOMS_DATA[roomIndex];

    if (body.room_number !== undefined) room.room_number = body.room_number;
    if (body.floor !== undefined) room.floor = Number(body.floor);
    if (body.room_type !== undefined) room.room_type = body.room_type;
    if (body.price_per_night !== undefined) room.price_per_night = Number(body.price_per_night);
    if (body.image_url !== undefined) room.image_url = body.image_url;
    if (body.area_sqft !== undefined) room.area_sqft = Number(body.area_sqft);
    if (body.bed_type !== undefined) room.bed_type = body.bed_type;
    if (body.max_occupancy !== undefined) room.max_occupancy = body.max_occupancy;
    if (body.view_type !== undefined) room.view_type = body.view_type;
    if (body.amenities !== undefined) room.amenities = body.amenities;
    if (body.description !== undefined) room.description = body.description;
    if (body.status !== undefined) room.status = body.status;
    if (body.is_occupied !== undefined) room.is_occupied = Boolean(body.is_occupied);

    return NextResponse.json(room, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Error updating suite specifications' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const roomId = parseInt(params.id, 10);
  const idx = ROOMS_DATA.findIndex(r => r.id === roomId);
  if (idx !== -1) {
    ROOMS_DATA.splice(idx, 1);
  }
  return NextResponse.json({ message: `Suite ${roomId} deleted successfully` }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
