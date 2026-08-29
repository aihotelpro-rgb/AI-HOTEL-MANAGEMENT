import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const WHATSAPP_FEED = [
  {
    id: 1,
    guest_name: "Maharaja Raghavendra Singh",
    room_number: "304",
    phone: "+91 98111 22233",
    message: "Namaste! Please arrange airport transfer for tomorrow 10 AM.",
    timestamp: new Date().toISOString(),
    status: "Received",
    ai_suggested_reply: "Greetings Maharaja! Your luxury Mercedes S-Class transfer has been scheduled for 10:00 AM tomorrow."
  },
  {
    id: 2,
    guest_name: "Pooja Sharma",
    room_number: "102",
    phone: "+91 98222 33344",
    message: "Could you send 2 extra bottles of packaged mineral water to Suite 102?",
    timestamp: new Date(Date.now() - 300000).toISOString(),
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
