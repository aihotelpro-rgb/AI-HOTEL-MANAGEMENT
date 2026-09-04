import { NextRequest, NextResponse } from 'next/server';
import { updateOrderStatusInStore, getOrders } from '@/lib/kitchenOrdersStore';

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

    // BUG 3 FIX: updateOrderStatusInStore now reads disk before mutating + writes back
    const updated = updateOrderStatusInStore(orderId, status, runner_name, estimated_minutes);

    if (!updated) {
      return NextResponse.json(
        { error: `Order #${orderId} not found. It may have been placed in a different server session.` },
        {
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    return NextResponse.json(updated, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update order status' }, { status: 400 });
  }
}
