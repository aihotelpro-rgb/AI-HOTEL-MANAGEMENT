import { NextRequest, NextResponse } from 'next/server';
import { ROOMS_DATA, getRoomsByProperty } from '@/lib/roomsStore';

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const property_id = Number(searchParams.get('property_id') || 0);

  const roomsList = getRoomsByProperty(property_id);

  return NextResponse.json(roomsList, {
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
    const property_id = Number(body.property_id || 1);
    
    const newRoom = {
      id: ROOMS_DATA.length + 1,
      property_id: property_id,
      property_name: property_id === 2 ? "Blue Bird Palace & Spa" : property_id === 3 ? "Blue Bird Beach Resort" : "Hotel Blue Bird Inn",
      room_number: body.room_number || `${property_id}0${ROOMS_DATA.length + 1}`,
      floor: Number(body.floor || 1),
      room_type: body.room_type || "Deluxe Suite",
      status: body.status || "Clean",
      price_per_night: Number(body.price_per_night || 4500),
      image_url: body.image_url || "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600",
      area_sqft: Number(body.area_sqft || 550),
      bed_type: body.bed_type || "Royal King Bed",
      max_occupancy: body.max_occupancy || "2 Adults",
      view_type: body.view_type || "Ocean View",
      amenities: body.amenities || ["Wi-Fi", "Balcony"],
      description: body.description || "Luxury suite with premier amenities.",
      is_occupied: false,
      current_guest_name: null,
      intercom_extension: body.room_number || "101",
      intercom_status: "Active VoIP"
    };

    ROOMS_DATA.push(newRoom);

    return NextResponse.json(newRoom, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
