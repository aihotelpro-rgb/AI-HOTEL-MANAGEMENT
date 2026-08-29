import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ORDERS_LIST = [
  {
    id: 101,
    booking_id: 1,
    room_number: "304",
    guest_name: "Maharaja Raghavendra Singh",
    items: [
      { id: 3, name: "Royal Butter Chicken (Murgh Makhani)", quantity: 1, price: 560.0 },
      { id: 6, name: "Tandoori Garlic & Butter Naan Basket", quantity: 2, price: 140.0 }
    ],
    total_price: 840.0,
    status: "Preparing",
    special_instructions: "Mild spices please",
    created_at: new Date().toISOString()
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
  return NextResponse.json(ORDERS_LIST, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return NextResponse.json(
    {
      id: Math.floor(Math.random() * 900) + 100,
      status: "Submitted",
      message: "Order placed successfully! Kitchen has received your request."
    },
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}
