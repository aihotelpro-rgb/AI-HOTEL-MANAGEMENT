import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CHANNEL_STATUS = {
  is_enabled: true,
  channel_api_key: "aihos_channel_secret_2026",
  last_sync: new Date().toISOString(),
  channels: [
    { id: 1, name: "Self Website", code: "WEB", channel_type: "Direct Website", is_active: true, commission_percent: 0.0, rate_plan: "BAR", total_bookings: 14, total_revenue_inr: 91000.0 },
    { id: 2, name: "MakeMyTrip / Goibibo", code: "MMT", channel_type: "OTA Engine", is_active: true, commission_percent: 15.0, rate_plan: "Standard MMT", total_bookings: 28, total_revenue_inr: 215000.0 },
    { id: 3, name: "Booking.com Global", code: "BDC", channel_type: "Global OTA", is_active: true, commission_percent: 18.0, rate_plan: "Dynamic Genius", total_bookings: 19, total_revenue_inr: 182000.0 },
    { id: 4, name: "Agoda International", code: "AGD", channel_type: "Asian OTA", is_active: true, commission_percent: 16.5, rate_plan: "Package Rate", total_bookings: 9, total_revenue_inr: 78000.0 }
  ]
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
  return NextResponse.json(CHANNEL_STATUS, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
