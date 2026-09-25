import { NextRequest, NextResponse } from 'next/server';
import { addOrUpdateCheckIn, getActiveStays, ActiveStayRecord } from '../../store';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const bookingId = Number(params.bookingId);
    
    // Check if this booking already exists in our store
    const allStays = getActiveStays();
    const existing = allStays.find((s) => s.booking_id === bookingId);

    if (existing) {
      // Already checked in — just update status to CheckedIn
      const updated: ActiveStayRecord = { ...existing, status: 'CheckedIn' };
      addOrUpdateCheckIn(updated);
      return NextResponse.json(
        { ...updated, message: `Booking #${bookingId} converted to Check-In for Suite ${existing.room_number}.` },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // If no matching stay, create a default check-in (walk-in scenario)
    const newStay: ActiveStayRecord = {
      booking_id: bookingId,
      guest_name: `Reservation #${bookingId}`,
      guest_phone: '+91 00000 00000',
      room_number: '101',
      room_type: 'Deluxe Island King',
      check_in: new Date().toISOString(),
      check_out: new Date(Date.now() + 86400000 * 2).toISOString(),
      total_nights: 2,
      room_rate: 3500,
      vip_status: false,
      status: 'CheckedIn',
      nationality: 'Indian',
      purpose_of_visit: 'Tourism & Leisure',
    };
    
    addOrUpdateCheckIn(newStay);

    return NextResponse.json(
      { ...newStay, message: `Booking #${bookingId} converted to active Check-In.` },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { detail: `Conversion failed: ${err.message}` },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
