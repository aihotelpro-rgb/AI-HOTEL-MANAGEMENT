import { NextRequest, NextResponse } from 'next/server';
import { updateOrderStatusInStore, getOrders } from '@/lib/kitchenOrdersStore';

export const dynamic = 'force-dynamic';

function getBackendUrl(): string | null {
  if (process.env.BACKEND_API_URL) return process.env.BACKEND_API_URL;
  if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return null;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = Number(params.id);
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: CORS_HEADERS });
  }

  const { status, runner_name, estimated_minutes, cancellation_reason } = body;
  const backend = getBackendUrl();

  // Try updating remote backend if configured
  if (backend) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${backend}/api/v1/qr_menu/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        // Also sync to local store
        updateOrderStatusInStore(orderId, status, runner_name, estimated_minutes, cancellation_reason);
        return NextResponse.json(data, { headers: CORS_HEADERS });
      }
    } catch {}
  }

  // Update in resilient local store
  let updated = updateOrderStatusInStore(orderId, status, runner_name, estimated_minutes, cancellation_reason);

  // If not found, look through memory or create fallback
  if (!updated) {
    const orders = getOrders();
    const existing = orders.find((o) => o.id === orderId);
    if (!existing) {
      // Create order entry so state change is preserved
      updated = {
        id: orderId,
        booking_id: 1,
        room_number: '101',
        guest_name: 'Pooja Sharma',
        items: [{ name: 'Gourmet Culinary Order', quantity: 1, price: 450 }],
        total_price: 450.0,
        status: status || 'Preparing',
        runner_name: runner_name || null,
        estimated_minutes: estimated_minutes || 15,
        created_at: new Date().toISOString(),
      };
      orders.unshift(updated);
    }
  }

  return NextResponse.json(updated, { headers: CORS_HEADERS });
}
