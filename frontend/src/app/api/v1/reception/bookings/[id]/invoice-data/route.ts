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
  const totalRoomCharges = totalNights * roomRate;
  const totalDiningCharges = 850; // Standard in-room dining estimate
  const subtotal = totalRoomCharges + totalDiningCharges;
  const cgst = Math.round(subtotal * 0.06);
  const sgst = Math.round(subtotal * 0.06);
  const totalGst = cgst + sgst;
  const grandTotal = subtotal + totalGst;
  const advanceDeposit = stay?.vip_status ? 5000 : 2500;
  const balanceDue = Math.max(0, grandTotal - advanceDeposit);

  const charges = [
    {
      id: 1,
      charge_type: 'Room',
      description: `Suite ${stay ? stay.room_number : '101'} Accommodation (${totalNights} Night${totalNights > 1 ? 's' : ''} @ ₹${roomRate.toLocaleString('en-IN')}/night)`,
      amount: totalRoomCharges,
      created_at: stay ? stay.check_in : new Date().toISOString(),
    },
    {
      id: 2,
      charge_type: 'Dining',
      description: 'In-Room Breakfast & Refreshments (KDS)',
      amount: totalDiningCharges,
      created_at: new Date().toISOString(),
    },
  ];

  const data = {
    // ── Shape expected by Check-Out & Folio Modal ──
    booking_id: bookingId || 101,
    room_number: stay ? stay.room_number : '101',
    guest_name: stay ? stay.guest_name : 'Guest',
    guest_phone: stay ? stay.guest_phone : '',
    total_nights: totalNights,
    room_rate: roomRate,
    total_room_charges: totalRoomCharges,
    total_dining_charges: totalDiningCharges,
    charges: charges,
    subtotal: subtotal,
    gst_charges: totalGst,
    grand_total: grandTotal,
    advance_paid: advanceDeposit,
    balance_due: balanceDue,

    // ── Extended invoice shape ──
    invoice_number: `INV-2026-${bookingId ? String(bookingId).padStart(5, '0') : '00101'}`,
    invoice_date: new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    hotel_details: {
      name: 'Hotel Blue Bird Nest',
      gstin: '35AAAAB1234C1Z9',
      fssai: '1002100000123',
      address: 'Garacharma Main Road, Sri Vijayapuram, Andaman & Nicobar Islands 744105',
      phone: '+91 3192 259 222 / +91 98222 33344',
      email: 'reservations@hotelbluebirdnest.com',
      website: 'www.hotelbluebirdnest.com',
      logo_url: 'https://www.hotelbluebirdnest.com/favicon.ico',
    },
    guest_details: {
      name: stay ? stay.guest_name : 'Guest',
      phone: stay ? stay.guest_phone : '',
      email: stay?.guest_email || '',
      vip_status: stay ? stay.vip_status : false,
      nationality: stay?.nationality || 'Indian',
      id_type: stay?.id_type || 'Aadhaar Card',
      id_number: stay?.id_number || '',
      city_state_origin: stay?.city_state_origin || '',
      purpose_of_visit: stay?.purpose_of_visit || 'Tourism & Leisure',
      gstin: stay?.gstin || null,
    },
    stay_details: {
      booking_id: bookingId || 101,
      room_number: stay ? stay.room_number : '101',
      check_in: stay ? stay.check_in : new Date().toISOString(),
      check_out: stay ? stay.check_out : new Date(Date.now() + 86400000 * 2).toISOString(),
      total_nights: totalNights,
      room_rate: roomRate,
    },
    itemized_charges: charges,
    financial_summary: {
      subtotal: subtotal,
      cgst_percent: 6.0,
      cgst_amount: cgst,
      sgst_percent: 6.0,
      sgst_amount: sgst,
      total_gst: totalGst,
      tax_rate_percent: 12.0,
      grand_total: grandTotal,
      advance_deposit: advanceDeposit,
      balance_due: balanceDue,
      currency_symbol: '₹',
      currency_code: 'INR',
      payment_status: 'ADVANCE PARTIAL • PENDING SETTLEMENT',
    },
  };

  return NextResponse.json(data, { status: 200, headers: CORS_HEADERS });
}
