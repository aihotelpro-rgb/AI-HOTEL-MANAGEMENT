import { NextRequest, NextResponse } from 'next/server';
import { getActiveStays } from '../../../reception/store';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest, { params }: { params: { path?: string[] } }) {
  const bookingIdStr = params?.path?.[0] || '101';
  const bookingId = parseInt(bookingIdStr, 10) || 101;

  const stays = getActiveStays();
  const stay = stays.find((s) => s.booking_id === bookingId) || stays[0];

  const guestName = stay ? stay.guest_name : 'Guest';
  const roomNumber = stay ? stay.room_number : '101';
  const roomRate = stay ? stay.room_rate : 3500.0;
  const nights = stay ? stay.total_nights : 2;
  const roomTotal = roomRate * nights;
  const subtotal = roomTotal + 480.0; // Room + sample dining
  const gstAmount = Math.round(subtotal * 0.12 * 100) / 100;
  const grandTotal = subtotal + gstAmount;

  return NextResponse.json(
    {
      booking_id: bookingId,
      guest_name: guestName,
      room_number: roomNumber,
      room_rate: roomRate,
      total_room_charges: roomTotal,
      total_dining_charges: 480.0,
      total_amenity_charges: 0.0,
      subtotal: subtotal,
      gst_charges: gstAmount,
      grand_total: grandTotal,
      currency: '₹',
      charges: [
        {
          id: 1,
          charge_type: 'Room',
          description: `Suite ${roomNumber} Stay (${nights} Nights @ ₹${roomRate.toLocaleString()}/night)`,
          amount: roomTotal,
          is_paid: false,
          created_at: stay ? stay.check_in : new Date().toISOString(),
        },
        {
          id: 2,
          charge_type: 'Dining',
          description: 'In-Room Dining: Murgh Malai Tikka & Mint Chutney',
          amount: 480.0,
          is_paid: false,
          created_at: new Date().toISOString(),
        },
      ],
    },
    { status: 200, headers: CORS_HEADERS }
  );
}
