import { NextRequest, NextResponse } from 'next/server';
import { getActiveStays, ActiveStayRecord } from '../store';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateQuery = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const allStays = getActiveStays();
    const inHouse = allStays.filter((s) => s.status === 'CheckedIn');
    const checkedOut = allStays.filter((s) => s.status === 'CheckedOut');
    const confirmed = allStays.filter((s) => s.status === 'Confirmed');

    const totalRooms = 24;
    const occupiedCount = inHouse.length;
    const vacantCount = Math.max(0, totalRooms - occupiedCount);
    const occupancyPercent = ((occupiedCount / totalRooms) * 100).toFixed(1);

    // Revenue calculations
    let totalRoomRevenue = 0;
    let totalAdvanceCollected = 0;
    let cashAdvance = 0;
    let cardAdvance = 0;
    let upiAdvance = 0;
    let bankAdvance = 0;

    const guestLedger = allStays.map((s: ActiveStayRecord) => {
      const roomCharges = (s.total_nights || 1) * (s.room_rate || 3500);
      const diningCharges = s.status === 'CheckedIn' || s.status === 'CheckedOut' ? 850 : 0;
      const subtotal = roomCharges + diningCharges;
      const gst = Math.round(subtotal * 0.12);
      const grandTotal = subtotal + gst;
      const advance = Number(s.advance_payment || (s.vip_status ? 5000 : 2500));
      const mode = s.advance_mode || 'Cash';
      const balanceDue = Math.max(0, grandTotal - advance);

      if (s.status === 'CheckedIn') {
        totalRoomRevenue += s.room_rate || 3500;
      }
      totalAdvanceCollected += advance;

      if (mode === 'Cash') cashAdvance += advance;
      else if (mode === 'Card') cardAdvance += advance;
      else if (mode === 'UPI') upiAdvance += advance;
      else bankAdvance += advance;

      return {
        booking_id: s.booking_id,
        room_number: s.room_number,
        room_type: s.room_type,
        guest_name: s.guest_name,
        guest_phone: s.guest_phone,
        check_in: s.check_in.split('T')[0],
        check_out: s.check_out.split('T')[0],
        nights: s.total_nights || 1,
        tariff_per_night: s.room_rate,
        total_room_charges: roomCharges,
        dining_charges: diningCharges,
        subtotal: subtotal,
        gst_12_percent: gst,
        grand_total: grandTotal,
        advance_paid: advance,
        payment_mode: mode,
        balance_due: balanceDue,
        status: s.status,
        channel: s.channel || 'Direct Walk-In',
        vip: s.vip_status,
      };
    });

    const totalDiningRevenue = occupiedCount * 850;
    const grossSubtotal = totalRoomRevenue + totalDiningRevenue;
    const totalGst = Math.round(grossSubtotal * 0.12);
    const grandGrossRevenue = grossSubtotal + totalGst;

    const reportData = {
      report_title: "Daily Flash Manager's Night Audit & Revenue Report",
      hotel_name: 'Hotel Blue Bird Inn',
      property_code: 'BBI-PORTBLAIR-744105',
      address: 'Garacharma Main Road, Sri Vijayapuram, South Andaman 744105',
      gstin: '35AAAAB1234C1Z9',
      date: dateQuery,
      generated_at: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      inventory_summary: {
        total_rooms: totalRooms,
        occupied_rooms: occupiedCount,
        vacant_rooms: vacantCount,
        clean_ready: vacantCount,
        dirty_turnover: checkedOut.length,
        occupancy_rate: `${occupancyPercent}%`,
      },
      revenue_summary: {
        room_revenue_inr: totalRoomRevenue,
        food_beverage_inr: totalDiningRevenue,
        cgst_6_percent: Math.round(grossSubtotal * 0.06),
        sgst_6_percent: Math.round(grossSubtotal * 0.06),
        total_gst_inr: totalGst,
        grand_gross_revenue_inr: grandGrossRevenue,
        currency: 'INR (₹)',
      },
      cashier_settlement: {
        total_advance_collected: totalAdvanceCollected,
        cash_in_drawer: cashAdvance,
        card_pos_swipe: cardAdvance,
        upi_qr_digital: upiAdvance,
        bank_transfer: bankAdvance,
      },
      frontdesk_movement: {
        active_inhouse: inHouse.length,
        expected_arrivals: confirmed.length,
        departures_completed: checkedOut.length,
      },
      guest_ledger: guestLedger,
    };

    return NextResponse.json(reportData, { status: 200, headers: CORS_HEADERS });
  } catch (err: any) {
    return NextResponse.json(
      { detail: `Daily report generation failed: ${err.message}` },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
