// ─────────────────────────────────────────────────────────────────────────────
// CENTRALIZED IN-MEMORY PMS RECEPTION & BOOKINGS STORE
// Global singleton that tracks active stays, checked-in guests, and rooms.
// Ensures Front Desk PMS and Customer Room QR pages stay perfectly in sync.
// ─────────────────────────────────────────────────────────────────────────────

export interface ActiveStayRecord {
  booking_id: number;
  guest_name: string;
  guest_phone: string;
  guest_email?: string;
  room_number: string;
  room_type: string;
  check_in: string;
  check_out: string;
  total_nights: number;
  room_rate: number;
  vip_status: boolean;
  status: 'CheckedIn' | 'Confirmed' | 'CheckedOut';
  nationality?: string;
  id_type?: string;
  id_number?: string;
  city_state_origin?: string;
  purpose_of_visit?: string;
  gstin?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __pmsActiveStays: ActiveStayRecord[];
}

// Default initial active stays if store is empty
const INITIAL_STAYS: ActiveStayRecord[] = [
  {
    booking_id: 101,
    guest_name: 'Pooja Sharma',
    guest_phone: '+91 98222 33344',
    guest_email: 'pooja.sharma@techcorp.in',
    room_number: '101',
    room_type: 'Deluxe Island King',
    check_in: new Date().toISOString(),
    check_out: new Date(Date.now() + 86400000 * 2).toISOString(),
    total_nights: 2,
    room_rate: 3500.0,
    vip_status: false,
    status: 'CheckedIn',
    nationality: 'Indian',
    id_type: 'Aadhaar Card',
    purpose_of_visit: 'Business / IT Conference',
  },
  {
    booking_id: 204,
    guest_name: 'Maharaja Raghavendra Singh',
    guest_phone: '+91 98111 22233',
    guest_email: 'raghavendra@royalheritage.in',
    room_number: '204',
    room_type: 'Super Deluxe Sea Breeze',
    check_in: new Date().toISOString(),
    check_out: new Date(Date.now() + 86400000 * 3).toISOString(),
    total_nights: 3,
    room_rate: 5500.0,
    vip_status: true,
    status: 'CheckedIn',
    nationality: 'Indian',
    id_type: 'Passport',
    purpose_of_visit: 'Tourism & Leisure',
  },
];

if (!global.__pmsActiveStays) {
  global.__pmsActiveStays = [...INITIAL_STAYS];
}

export function getActiveStays(): ActiveStayRecord[] {
  return global.__pmsActiveStays;
}

export function getActiveStayByRoom(roomNumber: string): ActiveStayRecord | undefined {
  const cleanRoom = (roomNumber || '').trim();
  return global.__pmsActiveStays.find(
    (s) => s.room_number.trim() === cleanRoom && s.status === 'CheckedIn'
  );
}

export function addOrUpdateCheckIn(stay: ActiveStayRecord): ActiveStayRecord {
  const cleanRoom = stay.room_number.trim();
  // Remove existing active stay for this room if any
  global.__pmsActiveStays = global.__pmsActiveStays.filter(
    (s) => !(s.room_number.trim() === cleanRoom && s.status === 'CheckedIn')
  );
  const newRecord = { ...stay, room_number: cleanRoom, status: 'CheckedIn' as const };
  global.__pmsActiveStays.unshift(newRecord);
  return newRecord;
}

export function checkOutBooking(bookingId: number): ActiveStayRecord | undefined {
  const idx = global.__pmsActiveStays.findIndex((s) => s.booking_id === bookingId);
  if (idx !== -1) {
    global.__pmsActiveStays[idx].status = 'CheckedOut';
    return global.__pmsActiveStays[idx];
  }
  return undefined;
}
