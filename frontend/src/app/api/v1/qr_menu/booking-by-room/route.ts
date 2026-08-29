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

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const room = url.searchParams.get('room') || '204';
  
  return NextResponse.json(
    {
      booking_id: 1,
      room_number: room,
      guest_name: room === '101' ? 'Pooja Sharma' : 'Maharaja Raghavendra Singh',
      check_in: new Date().toISOString(),
      check_out: new Date(Date.now() + 86400000 * 3).toISOString(),
      is_active: true,
      hotel_name: "Hotel Blue Bird Inn",
      location: "Garacharma, Sri Vijayapuram, Andaman and Nicobar Islands",
      intercom_extension: room,
      front_desk_extension: "100"
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}
