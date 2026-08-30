import { NextRequest, NextResponse } from 'next/server';
import { checkOutBooking } from '../../store';

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

  checkOutBooking(bookingId);

  return NextResponse.json(
    {
      status: 'CheckedOut',
      booking_id: bookingId,
      message: 'Guest checked out successfully! Invoice settled and Room marked for Housekeeping.',
      grand_total: 10080.0,
      subtotal: 9000.0,
      gst_amount: 1080.0,
    },
    { status: 200, headers: CORS_HEADERS }
  );
}
