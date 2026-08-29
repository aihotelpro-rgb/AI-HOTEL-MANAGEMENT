import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const EXECUTIVE_STATS = {
  occupancy_percentage: 94.0,
  occupied_rooms: 47,
  total_rooms: 50,
  revpar: 11280.0,
  adr: 12000.0,
  total_revenue_inr: 564000.0,
  room_revenue_inr: 450000.0,
  dining_revenue_inr: 84000.0,
  spa_amenity_revenue_inr: 30000.0,
  active_guests: 98,
  pending_tickets: 2,
  kds_pending_orders: 1
};

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
  return NextResponse.json(EXECUTIVE_STATS, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
