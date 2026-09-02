import { NextRequest, NextResponse } from 'next/server';
import { getActiveStays } from '@/app/api/v1/reception/store';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const bookingId = Number(params.id);
  const stays = getActiveStays();
  const stay = stays.find((s: any) => s.booking_id === bookingId) || stays[0];

  const totalNights = stay ? stay.total_nights || 2 : 2;
  const roomRate = stay ? stay.room_rate || 3500 : 3500;
  const subtotal = totalNights * roomRate;
  const cgst = Math.round(subtotal * 0.06);
  const sgst = Math.round(subtotal * 0.06);
  const totalGst = cgst + sgst;
  const grandTotal = subtotal + totalGst;
  const advanceDeposit = stay?.vip_status ? 5000 : 2500;
  const balanceDue = Math.max(0, grandTotal - advanceDeposit);

  const data = {
    invoice_number: `INV-2026-${bookingId ? String(bookingId).padStart(5, '0') : '00101'}`,
    invoice_date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    hotel_details: {
      name: 'Hotel Blue Bird Inn',
      gstin: '35AAAAB1234C1Z9',
      address: 'Garacharma Main Road, Sri Vijayapuram, Andaman & Nicobar Islands 744105',
      phone: '+91 3192 259 222',
      email: 'reservations@hotelbluebirdnest.com',
      logo_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200'
    },
    guest_details: {
      name: stay ? stay.guest_name : 'Pooja Sharma',
      phone: stay ? stay.guest_phone : '+91 98222 33344',
      email: stay?.guest_email || 'pooja.sharma@techcorp.in',
      vip_status: stay ? stay.vip_status : false,
      nationality: stay?.nationality || 'Indian',
      id_type: stay?.id_type || 'Aadhaar Card',
      id_number: stay?.id_number || 'XXXX-XXXX-4819',
      city_state_origin: stay?.city_state_origin || 'New Delhi, DL',
      purpose_of_visit: stay?.purpose_of_visit || 'Business / IT Conference',
      gstin: stay?.gstin || null
    },
    stay_details: {
      booking_id: bookingId || 101,
      room_number: stay ? stay.room_number : '101',
      check_in: stay ? stay.check_in : new Date().toISOString(),
      check_out: stay ? stay.check_out : new Date(Date.now() + 86400000 * 2).toISOString(),
      total_nights: totalNights,
      room_rate: roomRate
    },
    itemized_charges: [
      {
        type: 'Room',
        description: `Suite ${stay ? stay.room_number : '101'} Accommodation (${totalNights} Nights @ ₹${roomRate.toLocaleString('en-IN')}/night)`,
        amount: subtotal,
        is_paid: false
      },
      {
        type: 'Dining',
        description: 'In-Room Breakfast & Refreshments (KDS)',
        amount: 850,
        is_paid: false
      }
    ],
    financial_summary: {
      subtotal: subtotal + 850,
      cgst_percent: 6.0,
      cgst_amount: Math.round((subtotal + 850) * 0.06),
      sgst_percent: 6.0,
      sgst_amount: Math.round((subtotal + 850) * 0.06),
      total_gst: Math.round((subtotal + 850) * 0.12),
      tax_rate_percent: 12.0,
      grand_total: Math.round((subtotal + 850) * 1.12),
      advance_deposit: advanceDeposit,
      balance_due: Math.round((subtotal + 850) * 1.12) - advanceDeposit,
      currency_symbol: '₹',
      currency_code: 'INR',
      payment_status: 'ADVANCE PARTIAL • PENDING SETTLEMENT'
    }
  };

  return NextResponse.json(data, { status: 200, headers: CORS_HEADERS });
}
