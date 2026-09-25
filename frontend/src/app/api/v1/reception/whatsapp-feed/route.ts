import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FEED_BASE_TIME = new Date().toISOString();
const WHATSAPP_FEED = [
  {
    id: 1,
    guest_name: "Maharaja Raghavendra Singh",
    room_number: "204",
    phone: "+91 98111 22233",
    message: "Namaste! Please arrange airport transfer for tomorrow 10 AM.",
    timestamp: "2026-09-25T10:30:00.000Z",
    status: "Received",
    ai_suggested_reply: "Greetings Maharaja! Your luxury Mercedes S-Class transfer has been scheduled for 10:00 AM tomorrow."
  },
  {
    id: 2,
    guest_name: "Pooja Sharma",
    room_number: "101",
    phone: "+91 98222 33344",
    message: "Could you send 2 extra bottles of packaged mineral water to Suite 101?",
    timestamp: "2026-09-25T10:15:00.000Z",
    status: "Dispatched",
    ai_suggested_reply: "Housekeeping is on their way with 2 complimentary Himalayan Mineral Water bottles."
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
  return NextResponse.json(WHATSAPP_FEED, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
