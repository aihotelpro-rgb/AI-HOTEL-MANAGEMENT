import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getBackendUrl(): string {
  return (
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8000'
  );
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date_filter = searchParams.get('date_filter') || 'all_time';
  const backend = getBackendUrl();

  try {
    const res = await fetch(
      `${backend}/api/v1/qr_menu/sales-history?date_filter=${date_filter}`,
      { cache: 'no-store' }
    );

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, { headers: CORS_HEADERS });
    }
  } catch { /* fall through to local summary */ }

  // Fallback: fetch orders from backend and compute locally
  try {
    const res = await fetch(`${backend}/api/v1/qr_menu/orders`, { cache: 'no-store' });
    if (res.ok) {
      const orders: any[] = await res.json();
      return NextResponse.json({
        date_filter,
        total_orders: orders.length,
        total_sales_inr: orders.reduce((s, o) => s + (o.total_price || 0), 0),
        delivered_count: orders.filter(o => o.status === 'Delivered').length,
        pending_count: orders.filter(o => o.status !== 'Delivered').length,
        top_dishes: [],
        recent_orders: orders.map(o => ({
          order_id: o.id,
          booking_id: o.booking_id,
          suite_number: o.room_number || `${o.booking_id}`,
          guest_name: o.guest?.name || o.guest_name || 'Resident Guest',
          total_price: o.total_price,
          status: o.status,
          items: o.items,
          special_instructions: o.special_instructions,
          created_at: o.created_at,
          delivered_at: o.delivered_at || null,
        })),
      }, { headers: CORS_HEADERS });
    }
  } catch { /* fall through */ }

  return NextResponse.json(
    { error: 'Sales history unavailable' },
    { status: 503, headers: CORS_HEADERS }
  );
}
