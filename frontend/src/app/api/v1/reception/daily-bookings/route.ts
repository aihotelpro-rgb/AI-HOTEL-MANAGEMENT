import { NextRequest, NextResponse } from 'next/server';
import { getActiveStays, ActiveStayRecord } from '../store';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startDateStr = searchParams.get('start_date');
  const endDateStr = searchParams.get('end_date');
  const search = (searchParams.get('search') || '').toLowerCase().trim();

  const allStays = getActiveStays();
  const today = new Date().toISOString().split('T')[0];

  // Convert stays to unified booking format
  const allBookings = allStays.map((s: ActiveStayRecord, idx: number) => {
    const checkInDate = s.check_in.split('T')[0];
    const checkOutDate = s.check_out.split('T')[0];
    const isCheckedIn = s.status === 'CheckedIn';
    const isCheckedOut = s.status === 'CheckedOut';

    const isConfirmed = s.status === 'Confirmed';

    return {
      id: idx + 1,
      booking_id: s.booking_id,
      guest_name: s.guest_name,
      guest_phone: s.guest_phone || '+91 00000 00000',
      room_number: s.room_number,
      room_type: s.room_type,
      check_in: checkInDate,
      check_out: checkOutDate,
      status: isCheckedOut ? 'Completed Stay' : isCheckedIn ? 'CheckedIn' : isConfirmed ? 'Expected Arrival' : s.status,
      total_nights: s.total_nights,
      room_rate: s.room_rate,
      is_vip: s.vip_status,
      is_active: isCheckedIn,
      channel: s.channel || 'Direct Walk-In',
      advance_payment: s.advance_payment || 0,
      advance_mode: s.advance_mode || 'Cash',
      nationality: s.nationality || 'Indian',
      purpose_of_visit: s.purpose_of_visit || 'Tourism & Leisure',
      intercom_extension: s.room_number,
    };
  });

  // Apply search filter
  const filtered = search
    ? allBookings.filter(
        (b) =>
          b.guest_name.toLowerCase().includes(search) ||
          b.room_number.includes(search) ||
          (b.guest_phone && b.guest_phone.includes(search))
      )
    : allBookings;

  // Categorize bookings
  const todayArrivals = filtered
    .filter((b) => b.check_in === today && b.status !== 'Completed Stay')
    .sort((a, b) => {
      // Expected arrivals waiting to check in appear first
      if (a.status === 'Expected Arrival' && b.status !== 'Expected Arrival') return -1;
      if (b.status === 'Expected Arrival' && a.status !== 'Expected Arrival') return 1;
      return 0;
    });

  const pendingArrivals = todayArrivals.filter((b) => b.status === 'Expected Arrival' || !b.is_active);
  const todayDepartures = filtered.filter(
    (b) => b.check_out === today && b.is_active
  );
  const activeStays = filtered.filter((b) => b.is_active);
  const pastHistory = filtered.filter((b) => b.status === 'Completed Stay');
  const upcomingReservations = filtered.filter(
    (b) => b.check_in > today && b.status !== 'Completed Stay'
  );

  // Apply date range filter to all_bookings if provided
  let dateFilteredAll = filtered;
  if (startDateStr && endDateStr) {
    dateFilteredAll = filtered.filter((b) => {
      const checkIn = b.check_in;
      const checkOut = b.check_out;
      return checkIn <= endDateStr && checkOut >= startDateStr;
    });
  }

  return NextResponse.json(
    {
      all_bookings: dateFilteredAll,
      today_arrivals: todayArrivals,
      today_departures: todayDepartures,
      active_stays: activeStays,
      past_history: pastHistory,
      upcoming_reservations: upcomingReservations,
      total_bookings_count: dateFilteredAll.length,
      arrivals_count: pendingArrivals.length > 0 ? pendingArrivals.length : todayArrivals.length,
      pending_arrivals_count: pendingArrivals.length,
      checked_in_arrivals_count: todayArrivals.length - pendingArrivals.length,
      departures_count: todayDepartures.length,
      active_count: activeStays.length,
      past_count: pastHistory.length,
    },
    {
      status: 200,
      headers: CORS_HEADERS,
    }
  );
}
