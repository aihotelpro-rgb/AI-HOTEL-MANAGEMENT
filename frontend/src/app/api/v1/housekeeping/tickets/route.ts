import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TICKETS_LIST = [
  {
    id: 1,
    booking_id: 1,
    room_number: "304",
    category: "Amenity",
    description: "Guest requested 2 extra plush bath towels and herbal sandalwood mist",
    status: "Pending",
    priority: "Medium",
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    booking_id: 2,
    room_number: "102",
    category: "Maintenance",
    description: "Espresso machine water level indicator check required",
    status: "In Progress",
    priority: "Low",
    created_at: new Date(Date.now() - 3600000).toISOString()
  }
];

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
  return NextResponse.json(TICKETS_LIST, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
