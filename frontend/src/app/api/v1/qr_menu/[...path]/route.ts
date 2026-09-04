import { NextRequest, NextResponse } from 'next/server';
import { getOrders, createOrder, updateOrderStatusInStore } from '@/lib/kitchenOrdersStore';

export const dynamic = 'force-dynamic';

function getBackendUrl(): string | null {
  if (process.env.BACKEND_API_URL) return process.env.BACKEND_API_URL;
  if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path || [];
  const url = new URL(req.url);
  const backend = getBackendUrl();

  // Try remote backend if configured
  if (backend) {
    try {
      const backendPath = path.join('/');
      const qs = url.searchParams.toString();
      const backendUrl = `${backend}/api/v1/qr_menu/${backendPath}${qs ? `?${qs}` : ''}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(backendUrl, { cache: 'no-store', signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, { headers: corsHeaders });
      }
    } catch {}
  }

  // Local fallback
  if (path.length >= 1 && path[0] === 'orders') {
    const booking_id = url.searchParams.get('booking_id');
    const status_filter = url.searchParams.get('status');
    let filtered = getOrders();
    if (booking_id) {
      filtered = filtered.filter((o) => o.booking_id === Number(booking_id));
    }
    if (status_filter) {
      filtered = filtered.filter((o) => o.status === status_filter);
    }
    return NextResponse.json(filtered, { headers: corsHeaders });
  }

  if (path.length === 1 && path[0] === 'sales-history') {
    const orders = getOrders();
    return NextResponse.json({
      date_filter: 'all_time',
      total_orders: orders.length,
      total_sales_inr: orders.reduce((sum, o) => sum + o.total_price, 0),
      delivered_count: orders.filter((o) => o.status === 'Delivered').length,
      pending_count: orders.filter((o) => o.status !== 'Delivered').length,
      top_dishes: [],
      recent_orders: orders,
    }, { headers: corsHeaders });
  }

  return NextResponse.json(getOrders(), { headers: corsHeaders });
}

export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path || [];
  let body: any = {};
  try { body = await req.json(); } catch {}

  const backend = getBackendUrl();
  if (backend) {
    try {
      const backendPath = path.join('/');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${backend}/api/v1/qr_menu/${backendPath}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, { headers: corsHeaders });
      }
    } catch {}
  }

  if (path.length >= 3 && path[0] === 'orders' && path[2] === 'status') {
    const orderId = Number(path[1]);
    const updated = updateOrderStatusInStore(orderId, body.status, body.runner_name, body.estimated_minutes);
    return NextResponse.json(updated || { id: orderId, ...body }, { headers: corsHeaders });
  }

  return NextResponse.json({ status: 'ok' }, { headers: corsHeaders });
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path || [];
  let body: any = {};
  try { body = await req.json(); } catch {}

  const backend = getBackendUrl();
  if (backend) {
    try {
      const backendPath = (path[0] === 'orders' || path[0] === 'order') ? 'order' : path.join('/');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${backend}/api/v1/qr_menu/${backendPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, { status: 201, headers: corsHeaders });
      }
    } catch {}
  }

  const newOrder = createOrder({
    booking_id: Number(body.booking_id || 1),
    room_number: body.room_number || `${body.booking_id || 101}`,
    guest_name: body.guest_name || 'Resident Guest',
    items: body.items || [],
    total_price: Number(body.total_price || 0),
    special_instructions: body.special_instructions || null,
  });

  return NextResponse.json(newOrder, { status: 201, headers: corsHeaders });
}
