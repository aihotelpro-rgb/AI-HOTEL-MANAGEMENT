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
    const roomNumber = String(body.room_number || '101').trim();
    const guestName = String(body.guest_name || 'Guest').trim();
    const guestPhone = String(body.guest_phone || '+91 00000 00000');
    const guestEmail = body.guest_email || undefined;
    const checkInDate = body.check_in_date || body.check_in || new Date().toISOString().split('T')[0];
    const checkOutDate = body.check_out_date || body.check_out || new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
    
    // Calculate nights
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    const totalNights = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
    
    const roomRate = Number(body.room_rate || 4500);
    const channel = String(body.channel || 'Direct Walk-In');
    const vipStatus = Boolean(body.vip_status || body.isVip);
    const advancePayment = Number(body.advance_payment || body.advance_amount || 0);
    const advanceMode = String(body.advance_mode || 'Cash');

    const bookingId = Math.floor(Math.random() * 9000) + 1000;

    const reservationRecord: ActiveStayRecord = {
      booking_id: bookingId,
      guest_name: guestName,
      guest_phone: guestPhone,
      guest_email: guestEmail,
      room_number: roomNumber,
      room_type: roomNumber.startsWith('2') ? 'Super Deluxe Sea Breeze' : 'Deluxe Island King',
      check_in: new Date(checkInDate).toISOString(),
      check_out: new Date(checkOutDate).toISOString(),
      total_nights: totalNights,
      room_rate: roomRate,
      vip_status: vipStatus,
      status: 'Confirmed',
      channel: channel,
      advance_payment: advancePayment,
      advance_mode: advanceMode,
      nationality: body.nationality || 'Indian',
      id_type: body.id_type || 'Aadhaar Card',
      id_number: body.id_number,
      city_state_origin: body.city_state_origin,
      purpose_of_visit: body.purpose_of_visit || 'Tourism & Leisure',
      gstin: body.gstin,
      created_at: new Date().toISOString(),
    };

    // Save to centralized PMS store so Stayview Matrix and Calendar immediately reflect it
    addOrUpdateCheckIn(reservationRecord);

    return NextResponse.json(
      {
        booking_id: bookingId,
        room_number: roomNumber,
        guest_name: guestName,
        check_in: checkInDate,
        check_out: checkOutDate,
        total_nights: totalNights,
        room_rate: roomRate,
        advance_payment: advancePayment,
        advance_mode: advanceMode,
        status: 'Confirmed',
        message: `Advance Reservation #${bookingId} confirmed for ${guestName} in Suite ${roomNumber} with ₹${advancePayment.toLocaleString('en-IN')} (${advanceMode}) advance paid.`,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { detail: `Reservation creation failed: ${err.message}` },
      { status: 400, headers: CORS_HEADERS }
    );
  }
}
