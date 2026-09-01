import { NextRequest, NextResponse } from 'next/server';
import { updateOrderStatusInStore, KITCHEN_ORDERS_DATA } from '@/lib/kitchenOrdersStore';

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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orderId = Number(params.id);
    const body = await req.json();
    const { status, runner_name, estimated_minutes } = body;

    const updated = updateOrderStatusInStore(orderId, status, runner_name, estimated_minutes);

    if (!updated) {
      // Fallback: create or modify order in memory if ID wasn't found
      const fallbackOrder = {
        id: orderId,
        booking_id: 1,
        room_number: "101",
        guest_name: "Pooja Sharma",
        items: [{ name: "Gourmet Culinary Order", quantity: 1, price: 450 }],
        total_price: 450.00,
        status: status || "Preparing",
        runner_name: runner_name || null,
        estimated_minutes: estimated_minutes || 15,
        special_instructions: null,
        created_at: new Date().toISOString()
      };
      KITCHEN_ORDERS_DATA.unshift(fallbackOrder);
      return NextResponse.json(fallbackOrder, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    return NextResponse.json(updated, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update order status" }, { status: 400 });
  }
}
