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
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {}
    
    // Check if this booking already exists in our store
    const allStays = getActiveStays();
    const existing = allStays.find((s) => s.booking_id === bookingId);

    if (existing) {
      // Update status to CheckedIn, merging any provided details
      const updated: ActiveStayRecord = {
        ...existing,
        ...body,
        status: 'CheckedIn'
      };
      addOrUpdateCheckIn(updated);
      return NextResponse.json(
        {
          ...updated,
          success: true,
          message: `🎉 Check-In Successful! ${updated.guest_name} is now checked into Suite ${updated.room_number}. Status updated to Active In-House.`,
        },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // If no matching stay, create a check-in using body or sensible defaults
    const newStay: ActiveStayRecord = {
      booking_id: bookingId,
      guest_name: body.guest_name || `Reservation #${bookingId}`,
      guest_phone: body.guest_phone || '+91 98000 00000',
      guest_email: body.guest_email || undefined,
      room_number: body.room_number || '101',
      room_type: body.room_type || 'Deluxe Island King',
      check_in: new Date().toISOString(),
      check_out: new Date(Date.now() + 86400000 * (body.total_nights || 2)).toISOString(),
      total_nights: body.total_nights || 2,
      room_rate: body.room_rate || 3500,
      vip_status: body.vip_status || false,
      status: 'CheckedIn',
      nationality: body.nationality || 'Indian',
      purpose_of_visit: body.purpose_of_visit || 'Tourism & Leisure',
      channel: body.channel || 'Direct Walk-In',
    };
    
    addOrUpdateCheckIn(newStay);

    return NextResponse.json(
      { ...newStay, success: true, message: `🎉 Check-In Successful! ${newStay.guest_name} is now checked into Suite ${newStay.room_number}. Status updated to Active In-House.` },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { detail: `Conversion failed: ${err.message}` },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
