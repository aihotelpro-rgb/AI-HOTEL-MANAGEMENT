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

export async function GET() {
  return NextResponse.json(ROOMS_DATA, {
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
    const newId = ROOMS_DATA.length > 0 ? Math.max(...ROOMS_DATA.map(r => r.id)) + 1 : 1;
    const newRoom = {
      id: newId,
      room_number: body.room_number || `${newId}`,
      floor: Number(body.floor || 1),
      room_type: body.room_type || "Deluxe Heritage King",
      status: "Clean",
      price_per_night: Number(body.price_per_night || 6500.0),
      image_url: body.image_url || "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600",
      area_sqft: Number(body.area_sqft || 550),
      bed_type: body.bed_type || "Royal King Bed",
      max_occupancy: body.max_occupancy || "2 Adults + 1 Child",
      view_type: body.view_type || "Palace Courtyard & Pool View",
      amenities: body.amenities || ["High-Speed Wi-Fi", "Espresso Bar", "Marble Bathtub"],
      description: body.description || "Authentic luxury suite with heritage architecture.",
      is_occupied: false,
      current_guest_name: null,
      intercom_extension: body.room_number || `${newId}`,
      intercom_status: "Active VoIP"
    };

    ROOMS_DATA.push(newRoom);

    return NextResponse.json(newRoom, {
      status: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Error creating room' }, { status: 500 });
  }
}
