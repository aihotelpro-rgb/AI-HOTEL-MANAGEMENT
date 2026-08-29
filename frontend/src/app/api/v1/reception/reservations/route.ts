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
  try {
    const body = await req.json().catch(() => ({}));
    const roomNumber = body.room_number || '204';
    const guestName = body.guest_name || 'Guest';

    return NextResponse.json(
      {
        booking_id: Math.floor(Math.random() * 900) + 100,
        room_number: roomNumber,
        guest_name: guestName,
        status: "Reserved",
        message: `Reservation confirmed for ${guestName} in Room ${roomNumber} at Hotel Blue Bird Inn`
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
  } catch (err: any) {
    return NextResponse.json({ detail: "Reservation failed" }, { status: 400 });
  }
}
