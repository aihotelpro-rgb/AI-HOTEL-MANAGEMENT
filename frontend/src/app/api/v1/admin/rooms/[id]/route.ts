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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const roomId = parseInt(params.id, 10);
    const body = await req.json();

    const updatedRoom = {
      id: roomId,
      room_number: body.room_number || `${roomId}`,
      floor: Number(body.floor || 1),
      room_type: body.room_type || "Deluxe Heritage King",
      status: "Clean",
      price_per_night: Number(body.price_per_night || 6500.0),
      image_url: body.image_url || "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600",
      area_sqft: Number(body.area_sqft || 550),
      bed_type: body.bed_type || "Royal King Bed",
      max_occupancy: body.max_occupancy || "2 Adults + 1 Child",
      view_type: body.view_type || "Palace Courtyard & Pool View",
      amenities: body.amenities || ["High-Speed Wi-Fi", "Espresso Bar", "Marble Bathtub", "Smart Automation", "Balcony"],
      description: body.description || "Authentic luxury suite with hand-carved jharokha arches, plush Italian linens, and high-speed palace connectivity.",
      is_occupied: false,
      intercom_extension: body.room_number || `${roomId}`,
      intercom_status: "Active VoIP"
    };

    return NextResponse.json(updatedRoom, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Error updating room' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const roomId = parseInt(params.id, 10);
  return NextResponse.json({ message: `Room ${roomId} deleted successfully` }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
