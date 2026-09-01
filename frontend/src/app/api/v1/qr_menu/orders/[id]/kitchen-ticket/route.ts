import { NextRequest, NextResponse } from 'next/server';
import { KITCHEN_ORDERS_DATA } from '@/lib/kitchenOrdersStore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const orderId = Number(params.id);
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
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
