import { NextResponse } from 'next/server';
import { getActiveStays } from '../store';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function GET() {
  const activeStays = getActiveStays().filter((s) => s.status === 'CheckedIn');
  const stayMap = new Map<string, string>();
  activeStays.forEach((s) => stayMap.set(s.room_number.trim(), s.guest_name));

  const ROOMS_24 = Array.from({ length: 24 }, (_, i) => {
    const floor = Math.floor(i / 12) + 1;
    const roomIdx = (i % 12) + 1;
    const roomNum = `${floor}${roomIdx.toString().padStart(2, '0')}`;
    
    // Check if guest is checked in from store, fallback to default for 101/204
    const guestName = stayMap.get(roomNum) || (roomNum === '101' ? 'Pooja Sharma' : roomNum === '204' ? 'Maharaja Raghavendra Singh' : null);
    const isOccupied = Boolean(guestName);

    let rtype = 'Deluxe Island King';
    let price = 3500.0;
    if (floor === 2 && roomIdx > 8) {
      rtype = 'Royal Andaman Suite';
      price = 8500.0;
    } else if (floor === 2) {
      rtype = 'Super Deluxe Sea Breeze';
      price = 5500.0;
    } else if (roomIdx > 8) {
      rtype = 'Executive Bay View Room';
      price = 4800.0;
    }

    return {
      id: i + 1,
      room_number: roomNum,
      floor: floor,
      room_type: rtype,
      status: isOccupied ? 'Occupied' : 'Clean',
      price_per_night: price,
      image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600',
      is_occupied: isOccupied,
      current_guest_name: guestName,
      intercom_extension: roomNum,
      intercom_status: 'Active VoIP',
    };
  });

  return NextResponse.json(ROOMS_24, { status: 200, headers: CORS_HEADERS });
}
