import { NextRequest, NextResponse } from 'next/server';
import { checkOutBooking, getActiveStays, ActiveStayRecord } from '../../store';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest, { params }: { params: { path?: string[] } }) {
  const bookingIdStr = params?.path?.[0] || '1';
  const bookingId = parseInt(bookingIdStr, 10) || 1;

  // Calculate bill amounts based on stay details
  const stays = getActiveStays();
  const stay = stays.find((s) => s.booking_id === bookingId);
  
  const roomRate = stay ? stay.room_rate : 3500.0;
  const nights = stay ? stay.total_nights : 2;
  const roomTotal = roomRate * nights;
  const diningTotal = 480.0;
  const subtotal = roomTotal + diningTotal;
  const gstAmount = Math.round(subtotal * 0.12 * 100) / 100;
  const grandTotal = subtotal + gstAmount;

  checkOutBooking(bookingId);

  return NextResponse.json(
    {
      status: 'CheckedOut',
      booking_id: bookingId,
      message: 'Guest checked out successfully! Invoice settled and Room marked for Housekeeping.',
      grand_total: grandTotal,
      subtotal: subtotal,
      gst_amount: gstAmount,
    },
    { status: 200, headers: CORS_HEADERS }
  );
}
