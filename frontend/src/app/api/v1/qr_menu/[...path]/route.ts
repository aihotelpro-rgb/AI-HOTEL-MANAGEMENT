import { NextRequest, NextResponse } from 'next/server';
import { KITCHEN_ORDERS_DATA, updateOrderStatusInStore } from '@/lib/kitchenOrdersStore';

export const dynamic = 'force-dynamic';

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

  // 1. GET /api/v1/qr_menu/orders/{order_id}/kitchen-ticket
  if (path.length >= 3 && path[0] === 'orders' && path[2] === 'kitchen-ticket') {
    const orderId = Number(path[1]);
    const order = KITCHEN_ORDERS_DATA.find(o => o.id === orderId) || {
      id: orderId,
      booking_id: 101,
      items: [
        { name: "Royal Butter Chicken (Murgh Makhani)", quantity: 2, price: 560.00 },
        { name: "Tandoori Garlic & Butter Naan Basket", quantity: 3, price: 140.00 }
      ],
      total_price: 1540.00,
      special_instructions: "No peanuts, mild spice level.",
      created_at: new Date().toISOString()
    };

    const timestampStr = new Date(order.created_at).toLocaleString();
    const roomNumber = order.booking_id ? `${order.booking_id}` : "101";

    const itemsHtml = order.items.map((item: any) => `
      <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; margin-bottom: 6px;">
          <span>${item.quantity}x ${item.name}</span>
          <span>₹${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
      </div>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>KOT Ticket #${order.id} - Suite ${roomNumber}</title>
          <meta charset="utf-8">
          <style>
              body { font-family: 'Courier New', Courier, monospace; width: 320px; margin: auto; padding: 10px; background: #fff; color: #000; }
              .kot-box { border: 2px dashed #000; padding: 15px; border-radius: 8px; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
              .suite-title { font-size: 22px; font-weight: 900; text-align: center; margin: 10px 0; background: #000; color: #fff; padding: 6px; border-radius: 4px; }
              .divider { border-top: 1px dashed #000; margin: 10px 0; }
              .instructions { background: #e5e7eb; padding: 8px; border: 1px solid #000; font-size: 13px; font-weight: bold; margin-top: 10px; }
              @media print {
                  body { width: 100%; margin: 0; padding: 0; }
                  .no-print { display: none; }
              }
          </style>
      </head>
      <body>
          <div class="no-print" style="text-align: center; margin-bottom: 10px;">
              <button onclick="window.print()" style="background: #000; color: #fff; border: none; padding: 8px 16px; font-weight: bold; cursor: pointer; border-radius: 4px;">🖨️ Print ESC/POS KOT</button>
          </div>
          <div class="kot-box">
              <div class="header">
                  <h2 style="margin: 0; font-size: 18px;">KITCHEN ORDER TICKET (KOT)</h2>
                  <p style="margin: 2px 0; font-size: 12px;">Blue Bird Nest Gourmet Kitchen</p>
                  <p style="margin: 2px 0; font-size: 11px;">Date: ${timestampStr}</p>
              </div>

              <div class="suite-title">SUITE ${roomNumber}</div>
              <p style="margin: 2px 0; font-size: 12px; text-align: center;">KOT #${order.id}</p>

              <div class="divider"></div>

              <div>
                  ${itemsHtml}
              </div>

              <div class="divider"></div>

              ${order.special_instructions ? `<div class="instructions">⚠️ CHEF NOTE: ${order.special_instructions}</div>` : ''}

              <div style="text-align: right; font-size: 16px; font-weight: 900; margin-top: 10px;">
                  TOTAL: ₹${order.total_price.toFixed(2)}
              </div>

              <div style="text-align: center; font-size: 10px; margin-top: 15px; border-top: 1px solid #000; padding-top: 5px;">
                  STATION: MAIN HOT KITCHEN & TANDOOR<br>
                  *** END OF KOT TICKET ***
              </div>
          </div>
      </body>
      </html>
    `;

    return new NextResponse(htmlContent, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  // 2. GET /api/v1/qr_menu/orders/{order_id}
  if (path.length === 2 && path[0] === 'orders' && !isNaN(Number(path[1]))) {
    const orderId = Number(path[1]);
    const order = KITCHEN_ORDERS_DATA.find(o => o.id === orderId);
    if (!order) {
      return NextResponse.json({ detail: "Order not found" }, { status: 404, headers: corsHeaders });
    }
    return NextResponse.json(order, { headers: corsHeaders });
  }

  // 3. GET /api/v1/qr_menu/orders
  if (path.length === 1 && path[0] === 'orders') {
    const booking_id = url.searchParams.get('booking_id');
    const status_filter = url.searchParams.get('status');

    let filtered = [...KITCHEN_ORDERS_DATA];
    if (booking_id) {
      filtered = filtered.filter(o => o.booking_id === Number(booking_id));
    }
    if (status_filter) {
      filtered = filtered.filter(o => o.status === status_filter);
    }
    return NextResponse.json(filtered, { headers: corsHeaders });
  }

  // 4. GET /api/v1/qr_menu/sales-history
  if (path.length === 1 && path[0] === 'sales-history') {
    const date_filter = url.searchParams.get('date_filter') || 'all_time';
    const orders = KITCHEN_ORDERS_DATA;

    return NextResponse.json({
      date_filter,
      total_orders: orders.length,
      total_sales_inr: orders.reduce((sum, o) => sum + o.total_price, 0),
      delivered_count: orders.filter(o => o.status === 'Delivered').length,
      pending_count: orders.filter(o => o.status !== 'Delivered').length,
      top_dishes: [
        { name: "Royal Butter Chicken (Murgh Makhani)", quantity: 18, revenue: 10080.0, category: "Indian Mains" },
        { name: "Awadhi Dum Gosht Biryani", quantity: 14, revenue: 8960.0, category: "Biryani & Rice" },
        { name: "Murgh Malai Tikka", quantity: 12, revenue: 5760.0, category: "Starters" },
        { name: "Tandoori Garlic & Butter Naan Basket", quantity: 35, revenue: 4900.0, category: "Breads" }
      ],
      recent_orders: orders.map(o => ({
        order_id: o.id,
        booking_id: o.booking_id,
        suite_number: `${o.booking_id + 100}`,
        guest_name: o.booking_id === 1 ? "Pooja Sharma" : "Maharaja Raghavendra Singh",
        total_price: o.total_price,
        status: o.status,
        items: o.items,
        special_instructions: o.special_instructions,
        created_at: o.created_at,
        delivered_at: o.delivered_at || null
      }))
    }, { headers: corsHeaders });
  }

  return NextResponse.json({ error: "Endpoint not found" }, { status: 404, headers: corsHeaders });
}

export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path || [];

  // PUT /api/v1/qr_menu/orders/{order_id}/status
  if (path.length >= 3 && path[0] === 'orders' && path[2] === 'status') {
    const orderId = Number(path[1]);
    try {
      const body = await req.json();
      const { status, runner_name, estimated_minutes } = body;

      const updated = updateOrderStatusInStore(orderId, status, runner_name, estimated_minutes);

      if (!updated) {
        const fallbackOrder = {
          id: orderId,
          booking_id: 1,
          items: [{ name: "Gourmet Culinary Order", quantity: 1, price: 450 }],
          total_price: 450.00,
          status: status || "Preparing",
          runner_name: runner_name || null,
          estimated_minutes: estimated_minutes || 15,
          special_instructions: null,
          created_at: new Date().toISOString()
        };
        KITCHEN_ORDERS_DATA.unshift(fallbackOrder);
        return NextResponse.json(fallbackOrder, { headers: corsHeaders });
      }

      return NextResponse.json(updated, { headers: corsHeaders });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Failed to update order status" }, { status: 400, headers: corsHeaders });
    }
  }

  return NextResponse.json({ error: "PUT endpoint not found" }, { status: 404, headers: corsHeaders });
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path || [];

  // POST /api/v1/qr_menu/orders or POST /api/v1/qr_menu/order
  if (path.length >= 1 && (path[0] === 'orders' || path[0] === 'order')) {
    try {
      const body = await req.json();
      const newOrder = {
        id: KITCHEN_ORDERS_DATA.length + 101,
        booking_id: Number(body.booking_id || 1),
        items: body.items || [],
        total_price: Number(body.total_price || 0),
        status: "Pending",
        runner_name: null,
        estimated_minutes: 25,
        special_instructions: body.special_instructions || null,
        created_at: new Date().toISOString()
      };

      KITCHEN_ORDERS_DATA.unshift(newOrder);
      return NextResponse.json(newOrder, { status: 201, headers: corsHeaders });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400, headers: corsHeaders });
    }
  }

  return NextResponse.json({ error: "POST endpoint not found" }, { status: 404, headers: corsHeaders });
}
