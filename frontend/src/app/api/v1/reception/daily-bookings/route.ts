import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DAILY_BOOKINGS = [
  {
    id: 1,
    booking_id: 1,
    guest_name: "Maharaja Raghavendra Singh",
    room_number: "204",
    room_type: "Super Deluxe Sea Breeze",
    check_in: new Date().toISOString().split('T')[0],
    check_out: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    status: "Confirmed",
    total_nights: 3,
    room_rate: 5500.0,
    is_vip: true,
    intercom_extension: "204"
  },
  {
    id: 2,
    booking_id: 2,
    guest_name: "Pooja Sharma",
    room_number: "101",
    room_type: "Deluxe Island King",
    check_in: new Date().toISOString().split('T')[0],
    check_out: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    status: "CheckedIn",
    total_nights: 2,
    room_rate: 3500.0,
    is_vip: false,
    intercom_extension: "101"
  }
];

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
  return NextResponse.json(DAILY_BOOKINGS, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
