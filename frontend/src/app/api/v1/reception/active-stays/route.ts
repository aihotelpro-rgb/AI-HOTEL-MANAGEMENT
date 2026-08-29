import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ACTIVE_STAYS = [
  {
    booking_id: 1,
    guest_name: "Maharaja Raghavendra Singh",
    phone: "+91 98111 22233",
    email: "raghavendra@royalheritage.in",
    room_number: "204",
    room_type: "Super Deluxe Sea Breeze",
    check_in: new Date().toISOString(),
    check_out: new Date(Date.now() + 86400000 * 3).toISOString(),
    vip_status: true,
    total_nights: 3,
    room_rate: 5500.0,
    folio_total: 17020.0,
    intercom_extension: "204"
  },
  {
    booking_id: 2,
    guest_name: "Pooja Sharma",
    phone: "+91 98222 33344",
    email: "pooja.sharma@techcorp.in",
    room_number: "101",
    room_type: "Deluxe Island King",
    check_in: new Date().toISOString(),
    check_out: new Date(Date.now() + 86400000 * 2).toISOString(),
    vip_status: false,
    total_nights: 2,
    room_rate: 3500.0,
    folio_total: 7000.0,
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

export async function GET() {
  return NextResponse.json(ACTIVE_STAYS, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
