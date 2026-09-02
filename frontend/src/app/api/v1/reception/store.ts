// ─────────────────────────────────────────────────────────────────────────────
// CENTRALIZED IN-MEMORY & DISK PERSISTED PMS RECEPTION STORE
// Global singleton that tracks active stays, checked-in guests, and room assignments.
// Enforces dual file-system persistence (/tmp & .next) for 100% stable in-house stays data.
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'fs';
import path from 'path';

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

const DISK_STAYS_FILE = path.join(process.cwd(), '.next', 'pms_active_stays.json');
const TMP_STAYS_FILE = '/tmp/pms_active_stays.json';

function _loadStaysFromDisk(): ActiveStayRecord[] | null {
  try {
    const file = fs.existsSync(TMP_STAYS_FILE)
      ? TMP_STAYS_FILE
      : fs.existsSync(DISK_STAYS_FILE)
      ? DISK_STAYS_FILE
      : null;
    if (file) {
      const raw = fs.readFileSync(file, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (e) {}
  return null;
}

function _saveStaysToDisk(stays: ActiveStayRecord[]) {
  try {
    const dataStr = JSON.stringify(stays, null, 2);
    try { fs.writeFileSync(TMP_STAYS_FILE, dataStr, 'utf8'); } catch (e) {}
    try { fs.writeFileSync(DISK_STAYS_FILE, dataStr, 'utf8'); } catch (e) {}
  } catch (e) {}
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

const diskStays = _loadStaysFromDisk();
if (diskStays && diskStays.length > 0) {
  global.__pmsActiveStays = diskStays;
} else if (!global.__pmsActiveStays) {
  global.__pmsActiveStays = [...INITIAL_STAYS];
  _saveStaysToDisk(global.__pmsActiveStays);
}

export function getActiveStays(): ActiveStayRecord[] {
  const disk = _loadStaysFromDisk();
  if (disk && disk.length > 0) {
    global.__pmsActiveStays = disk;
  }
  return global.__pmsActiveStays;
}

export function getActiveStayByRoom(roomNumber: string): ActiveStayRecord | undefined {
  const cleanRoom = (roomNumber || '').trim();
  const currentStays = getActiveStays();
  return currentStays.find(
    (s) => s.room_number.trim() === cleanRoom && s.status === 'CheckedIn'
  );
}

export function addOrUpdateCheckIn(stay: ActiveStayRecord): ActiveStayRecord {
  const cleanRoom = stay.room_number.trim();
  const currentStays = getActiveStays();
  
  const updatedStays = currentStays.filter(
    (s) => !(s.room_number.trim() === cleanRoom && s.status === 'CheckedIn')
  );
  
  const newRecord = { ...stay, room_number: cleanRoom, status: 'CheckedIn' as const };
  updatedStays.unshift(newRecord);
  
  global.__pmsActiveStays = updatedStays;
  _saveStaysToDisk(updatedStays);
  return newRecord;
}

export function checkOutBooking(bookingId: number): ActiveStayRecord | undefined {
  const currentStays = getActiveStays();
  const idx = currentStays.findIndex((s) => s.booking_id === bookingId);
  if (idx !== -1) {
    currentStays[idx].status = 'CheckedOut';
    global.__pmsActiveStays = currentStays;
    _saveStaysToDisk(currentStays);
    return currentStays[idx];
  }
  return undefined;
}
