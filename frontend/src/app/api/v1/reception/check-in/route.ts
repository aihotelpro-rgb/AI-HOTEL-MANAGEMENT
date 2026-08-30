import { NextRequest, NextResponse } from 'next/server';
import { addOrUpdateCheckIn, ActiveStayRecord } from '../store';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const roomNumber = String(body.room_number || body.roomNumber || '101').trim();
    const guestName = String(body.guest_name || body.guestName || (roomNumber === '101' ? 'Pooja Sharma' : 'Maharaja Raghavendra Singh')).trim();
    const guestPhone = String(body.guest_phone || body.guestPhone || '+91 98222 33344');
    const guestEmail = body.guest_email || body.guestEmail;
    const nights = Number(body.nights || body.total_nights || 2);
    const roomRate = Number(body.room_rate || body.roomRate || 3500.0);
    const vipStatus = Boolean(body.vip_status || body.isVip);

    const bookingId = Math.floor(Math.random() * 9000) + 1000;
    const checkInDate = new Date().toISOString();
    const checkOutDate = new Date(Date.now() + 86400000 * nights).toISOString();

    const stayRecord: ActiveStayRecord = {
      booking_id: bookingId,
      guest_name: guestName,
      guest_phone: guestPhone,
      guest_email: guestEmail,
      room_number: roomNumber,
      room_type: roomNumber.startsWith('2') ? 'Super Deluxe Sea Breeze' : 'Deluxe Island King',
      check_in: checkInDate,
      check_out: checkOutDate,
      total_nights: nights,
      room_rate: roomRate,
      vip_status: vipStatus,
      status: 'CheckedIn',
      nationality: body.nationality || 'Indian',
      id_type: body.id_type || 'Aadhaar Card',
      id_number: body.id_number,
      city_state_origin: body.city_state_origin,
      purpose_of_visit: body.purpose_of_visit || 'Tourism & Leisure',
      gstin: body.gstin,
    };

    // Save to central store
    addOrUpdateCheckIn(stayRecord);

    return NextResponse.json(
      {
        ...stayRecord,
        id: bookingId,
        is_active: true,
        message: `Successfully checked in ${guestName} to Room ${roomNumber} at Hotel Blue Bird Inn!`,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json({ detail: 'Check-in failed' }, { status: 400, headers: CORS_HEADERS });
  }
}
