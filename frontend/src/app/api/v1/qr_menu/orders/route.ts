import { NextRequest, NextResponse } from 'next/server';
import { getOrders, createOrder } from '@/lib/kitchenOrdersStore';

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const booking_id = searchParams.get('booking_id');
  const status_filter = searchParams.get('status');
  const backend = getBackendUrl();

  // If remote backend URL is explicitly configured, try proxying with timeout
  if (backend) {
    try {
      const qs = searchParams.toString();
      const backendUrl = `${backend}/api/v1/qr_menu/orders${qs ? `?${qs}` : ''}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(backendUrl, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const remoteData = await res.json();
        if (Array.isArray(remoteData)) {
          const localOrders = getOrders();
          const localMap = new Map(localOrders.map((o) => [o.id, o]));
          const STATUS_RANKS: Record<string, number> = {
            Pending: 1, Cooking: 2, Preparing: 2, Ready: 3, OutForDelivery: 4, Delivered: 5, Cancelled: 6
          };
          const merged = remoteData.map((ro: any) => {
            const lo = localMap.get(ro.id);
            if (!lo) return ro;
            const roRank = STATUS_RANKS[ro.status] || 0;
            const loRank = STATUS_RANKS[lo.status] || 0;
            if (loRank > roRank) {
              return {
                ...ro,
                status: lo.status,
                runner_name: lo.runner_name || ro.runner_name,
                delivered_at: lo.delivered_at || ro.delivered_at,
                estimated_minutes: lo.estimated_minutes ?? ro.estimated_minutes,
              };
            }
            return ro;
          });
          return NextResponse.json(merged, { headers: CORS_HEADERS });
        }
        return NextResponse.json(remoteData, { headers: CORS_HEADERS });
      }
    } catch {}
  }

  // Resilient Local Store fallback (always succeeds)
  let orders = getOrders();
  if (booking_id) {
    orders = orders.filter((o) => o.booking_id === Number(booking_id));
  }
  if (status_filter) {
    orders = orders.filter((o) => o.status === status_filter);
  }

  return NextResponse.json(orders, { headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: CORS_HEADERS });
  }

  const backend = getBackendUrl();
  if (backend) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${backend}/api/v1/qr_menu/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, { status: 201, headers: CORS_HEADERS });
      }
    } catch {}
  }

  // Local store creation
  const newOrder = createOrder({
    booking_id: Number(body.booking_id || 1),
    room_number: body.room_number || `${body.booking_id || 101}`,
    guest_name: body.guest_name || 'Resident Guest',
    items: body.items || [],
    total_price: Number(body.total_price || 0),
    special_instructions: body.special_instructions || null,
  });

  return NextResponse.json(newOrder, { status: 201, headers: CORS_HEADERS });
}
