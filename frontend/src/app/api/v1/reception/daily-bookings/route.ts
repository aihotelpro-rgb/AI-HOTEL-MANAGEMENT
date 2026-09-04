import { NextRequest, NextResponse } from 'next/server';
import { getActiveStays } from '../store';

export const dynamic = 'force-dynamic';

const BASE_DAILY_BOOKINGS = [
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
  const stays = getActiveStays();
  const staysMap = new Map<string, string>();
  stays.forEach((s) => {
    staysMap.set(String(s.booking_id), s.status);
    staysMap.set(s.room_number.trim(), s.status);
  });

  const bookings = BASE_DAILY_BOOKINGS.map((b) => {
    // Check if matching stay in store was checked out
    const stayStatus =
      staysMap.get(String(b.booking_id)) ||
      (b.room_number === '101' ? staysMap.get('101') : undefined) ||
      staysMap.get(b.room_number);

    if (stayStatus === 'CheckedOut') {
      return { ...b, status: 'Completed Stay', is_active: false };
    }
    return b;
  });

  return NextResponse.json(bookings, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
