import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ROOMS_MATRIX = Array.from({ length: 50 }, (_, i) => {
  const floor = Math.floor(i / 10) + 1;
  const roomNum = `${floor}${((i % 10) + 1).toString().padStart(2, '0')}`;
  const isOccupied = roomNum === '304' || roomNum === '102' || roomNum === '501';
  return {
    id: i + 1,
    room_number: roomNum,
    floor: floor,
    room_type: floor === 5 ? "Maharaja Penthouse Suite" : floor >= 3 ? "Royal Heritage Suite" : "Deluxe Heritage King",
    status: isOccupied ? "Occupied" : "Clean",
    price_per_night: floor === 5 ? 18000.0 : floor >= 3 ? 9500.0 : 5500.0,
    image_url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600",
    is_occupied: isOccupied,
    current_guest_name: roomNum === '304' ? 'Maharaja Raghavendra Singh' : roomNum === '102' ? 'Pooja Sharma' : roomNum === '501' ? 'Vikram Malhotra' : null
  };
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET() {
  return NextResponse.json(ROOMS_MATRIX, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
