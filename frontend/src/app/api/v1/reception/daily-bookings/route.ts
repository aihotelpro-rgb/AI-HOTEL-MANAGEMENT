import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DAILY_BOOKINGS = [
  {
    id: 1,
    booking_id: 1,
    guest_name: "Maharaja Raghavendra Singh",
    room_number: "304",
    room_type: "Deluxe Heritage King",
    check_in: new Date().toISOString().split('T')[0],
    check_out: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    status: "Confirmed",
    total_nights: 3,
    room_rate: 6500.0,
    is_vip: true
  },
  {
    id: 2,
    booking_id: 2,
    guest_name: "Pooja Sharma",
    room_number: "102",
    room_type: "Executive Heritage Room",
    check_in: new Date().toISOString().split('T')[0],
    check_out: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    status: "CheckedIn",
    total_nights: 2,
    room_rate: 3800.0,
    is_vip: false
  },
  {
    id: 3,
    booking_id: 3,
    guest_name: "Vikram Malhotra",
    room_number: "501",
    room_type: "Maharaja Penthouse Suite",
    check_in: new Date().toISOString().split('T')[0],
    check_out: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
    status: "Confirmed",
    total_nights: 4,
    room_rate: 18000.0,
    is_vip: true
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

export async function GET() {
  return NextResponse.json(DAILY_BOOKINGS, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
