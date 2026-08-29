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
    const roomNumber = body.room_number || body.roomNumber || '204';
    const guestName = body.guest_name || body.guestName || 'Maharaja Raghavendra Singh';
    const nights = Number(body.nights || body.total_nights || 2);
    const roomRate = Number(body.room_rate || body.roomRate || 4500.0);

    const bookingId = Math.floor(Math.random() * 900) + 100;

    return NextResponse.json(
      {
        booking_id: bookingId,
        id: bookingId,
        room_number: roomNumber,
        guest_name: guestName,
        check_in: new Date().toISOString(),
        check_out: new Date(Date.now() + 86400000 * nights).toISOString(),
        total_nights: nights,
        room_rate: roomRate,
        status: "CheckedIn",
        is_active: true,
        message: `Successfully checked in ${guestName} to Room ${roomNumber} at Hotel Blue Bird Inn!`
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
    return NextResponse.json({ detail: "Check-in failed" }, { status: 400 });
  }
}
