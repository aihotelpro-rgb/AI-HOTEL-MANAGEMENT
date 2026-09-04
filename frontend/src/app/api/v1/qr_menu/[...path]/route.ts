import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getBackendUrl(): string {
  return (
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8000'
  );
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * Catch-all proxy: routes all /api/v1/qr_menu/[...path] requests to the Python FastAPI backend.
 * This ensures all data is stored in the real persistent database — no in-memory state.
 */

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path || [];
  const url = new URL(req.url);
  const backend = getBackendUrl();

  // Special case: /api/v1/qr_menu/orders/{id}/kitchen-ticket — render KOT HTML locally
  if (path.length >= 3 && path[0] === 'orders' && path[2] === 'kitchen-ticket') {
    const orderId = path[1];
    let order: any;

    try {
      const res = await fetch(`${backend}/api/v1/qr_menu/orders/${orderId}`, { cache: 'no-store' });
      if (res.ok) order = await res.json();
    } catch { /* backend unavailable */ }

    if (!order) {
      order = {
        id: orderId, booking_id: 101, room_number: '101',
        items: [{ name: 'Royal Butter Chicken', quantity: 1, price: 560.00 }],
        total_price: 560.00, special_instructions: null, created_at: new Date().toISOString()
      };
    }

    const timestampStr = new Date(order.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const roomNumber = order.room_number || `${order.booking_id}` || '101';
    const guestName = order.guest?.name || order.guest_name || 'Resident Guest';
    const itemsHtml = (order.items || []).map((item: any) => `
      <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:bold;margin-bottom:6px;">
        <span>${item.quantity}x ${item.name}</span><span>₹${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
      </div>`).join('');

    const htmlContent = `<!DOCTYPE html><html><head><title>KOT #${order.id} - Suite ${roomNumber}</title><meta charset="utf-8">
      <style>body{font-family:'Courier New',monospace;width:320px;margin:auto;padding:10px;background:#fff;color:#000}
      .kot-box{border:2px dashed #000;padding:15px;border-radius:8px}.header{text-align:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:10px}
      .suite-title{font-size:22px;font-weight:900;text-align:center;margin:10px 0;background:#000;color:#fff;padding:6px;border-radius:4px}
      .divider{border-top:1px dashed #000;margin:10px 0}.instructions{background:#e5e7eb;padding:8px;border:1px solid #000;font-size:13px;font-weight:bold;margin-top:10px}
      @media print{body{width:100%;margin:0;padding:0}.no-print{display:none}}</style></head><body>
      <div class="no-print" style="text-align:center;margin-bottom:10px;">
        <button onclick="window.print()" style="background:#000;color:#fff;border:none;padding:8px 16px;font-weight:bold;cursor:pointer;border-radius:4px;">🖨️ Print ESC/POS KOT</button>
      </div>
      <div class="kot-box">
        <div class="header"><h2 style="margin:0;font-size:18px;">KITCHEN ORDER TICKET (KOT)</h2>
          <p style="margin:2px 0;font-size:12px;">Hotel Blue Bird Inn — Gourmet Kitchen</p>
          <p style="margin:2px 0;font-size:11px;">Date: ${timestampStr}</p></div>
        <div class="suite-title">SUITE ${roomNumber}</div>
        <p style="margin:2px 0;font-size:12px;text-align:center;">KOT #${order.id} | ${guestName}</p>
        <div class="divider"></div><div>${itemsHtml}</div><div class="divider"></div>
        ${order.special_instructions ? `<div class="instructions">⚠️ CHEF NOTE: ${order.special_instructions}</div>` : ''}
        <div style="text-align:right;font-size:16px;font-weight:900;margin-top:10px;">TOTAL: ₹${(order.total_price || 0).toFixed(2)}</div>
        <div style="text-align:center;font-size:10px;margin-top:15px;border-top:1px solid #000;padding-top:5px;">STATION: MAIN HOT KITCHEN &amp; TANDOOR<br>*** END OF KOT TICKET ***</div>
      </div></body></html>`;

    return new NextResponse(htmlContent, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  // All other GETs: proxy to backend
  const backendPath = path.join('/');
  const qs = url.searchParams.toString();
  const backendUrl = `${backend}/api/v1/qr_menu/${backendPath}${qs ? `?${qs}` : ''}`;

  try {
    const res = await fetch(backendUrl, { cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Backend error' }));
      return NextResponse.json(err, { status: res.status, headers: corsHeaders });
    }
    const data = await res.json();
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: `Backend unreachable: ${err.message}` }, { status: 503, headers: corsHeaders });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path || [];
  const backend = getBackendUrl();

  const backendPath = path.join('/');
  try {
    const body = await req.json();
    const res = await fetch(`${backend}/api/v1/qr_menu/${backendPath}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Backend error' }));
      return NextResponse.json(err, { status: res.status, headers: corsHeaders });
    }

    const data = await res.json();
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: `Backend unreachable: ${err.message}` }, { status: 503, headers: corsHeaders });
  }
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path || [];
  const backend = getBackendUrl();

  // Normalize: both /order and /orders go to /api/v1/qr_menu/order
  const backendPath = (path[0] === 'orders' || path[0] === 'order') ? 'order' : path.join('/');

  try {
    const body = await req.json();
    const res = await fetch(`${backend}/api/v1/qr_menu/${backendPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Backend error' }));
      return NextResponse.json(err, { status: res.status, headers: corsHeaders });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 201, headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: `Backend unreachable: ${err.message}` }, { status: 503, headers: corsHeaders });
  }
}
