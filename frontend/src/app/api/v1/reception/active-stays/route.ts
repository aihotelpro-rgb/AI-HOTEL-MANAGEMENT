import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ACTIVE_STAYS = [
  {
    booking_id: 1,
    guest_name: "Maharaja Raghavendra Singh",
    phone: "+91 98111 22233",
    email: "raghavendra@royalheritage.in",
    room_number: "304",
    room_type: "Deluxe Heritage King",
    check_in: new Date().toISOString(),
    check_out: new Date(Date.now() + 86400000 * 3).toISOString(),
    vip_status: true,
    total_nights: 3,
    room_rate: 6500.0,
    folio_total: 20340.0
  },
  {
    booking_id: 2,
    guest_name: "Pooja Sharma",
    phone: "+91 98222 33344",
    email: "pooja.sharma@techcorp.in",
    room_number: "102",
    room_type: "Executive Heritage Room",
    check_in: new Date().toISOString(),
    check_out: new Date(Date.now() + 86400000 * 2).toISOString(),
    vip_status: false,
    total_nights: 2,
    room_rate: 3800.0,
    folio_total: 7600.0
  },
  {
    booking_id: 3,
    guest_name: "Vikram Malhotra",
    phone: "+91 98333 44455",
    email: "vikram@malhotracapital.in",
    room_number: "501",
    room_type: "Maharaja Penthouse Suite",
    check_in: new Date().toISOString(),
    check_out: new Date(Date.now() + 86400000 * 4).toISOString(),
    vip_status: true,
    total_nights: 4,
    room_rate: 18000.0,
    folio_total: 72000.0
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
