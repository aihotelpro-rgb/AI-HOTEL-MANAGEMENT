import { NextRequest, NextResponse } from 'next/server';
import { roomMappings } from '@/lib/otaStore';

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

export async function GET() {
  return NextResponse.json(roomMappings, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newMapping = {
      id: roomMappings.length + 1,
      pms_room_type: body.pms_room_type || "Deluxe Heritage Room",
      pms_room_code: body.pms_room_code || "DHR",
      ota_name: body.ota_name || "Booking.com Global",
      ota_code: body.ota_code || "BDC",
      ota_room_type_code: body.ota_room_type_code || "OTA_RM_01",
      ota_room_type_name: body.ota_room_type_name || "OTA Deluxe Category",
      is_active: true
    };
    roomMappings.push(newMapping);
    return NextResponse.json({ status: "success", message: "Room Mapping created successfully!", mapping: newMapping }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Error creating room mapping' }, { status: 500 });
  }
}
