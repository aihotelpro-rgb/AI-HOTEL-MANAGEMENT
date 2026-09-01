import { NextRequest, NextResponse } from 'next/server';
import { KITCHEN_ORDERS_DATA } from '@/lib/kitchenOrdersStore';

export const dynamic = 'force-dynamic';

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const booking_id = searchParams.get('booking_id');
  const status_filter = searchParams.get('status');

  let filtered = [...KITCHEN_ORDERS_DATA];
  if (booking_id) {
    filtered = filtered.filter(o => o.booking_id === Number(booking_id));
  }
  if (status_filter) {
    filtered = filtered.filter(o => o.status === status_filter);
  }

  return NextResponse.json(filtered, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newOrder = {
      id: KITCHEN_ORDERS_DATA.length + 101,
      booking_id: Number(body.booking_id || 1),
      room_number: body.room_number || `${body.booking_id || 101}`,
      guest_name: body.guest_name || "Resident Guest",
      items: body.items || [],
      total_price: Number(body.total_price || 0),
      status: "Pending",
      runner_name: null,
      estimated_minutes: 25,
      special_instructions: body.special_instructions || null,
      created_at: new Date().toISOString()
    };

    KITCHEN_ORDERS_DATA.unshift(newOrder);

    return NextResponse.json(newOrder, {
      status: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
