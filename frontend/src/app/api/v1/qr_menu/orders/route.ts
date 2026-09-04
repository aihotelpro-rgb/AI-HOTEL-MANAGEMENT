import { NextRequest, NextResponse } from 'next/server';
import { getOrders, createOrder } from '@/lib/kitchenOrdersStore';

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

  // BUG 2 FIX: use getOrders() which reads from disk before returning
  let filtered = getOrders();
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
    // BUG 1 FIX: createOrder() uses Date.now() for unique IDs + persists to disk
    const newOrder = createOrder({
      booking_id: Number(body.booking_id || 1),
      room_number: body.room_number || `${body.booking_id || 101}`,
      guest_name: body.guest_name || 'Resident Guest',
      items: body.items || [],
      total_price: Number(body.total_price || 0),
      special_instructions: body.special_instructions || null,
    });

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
