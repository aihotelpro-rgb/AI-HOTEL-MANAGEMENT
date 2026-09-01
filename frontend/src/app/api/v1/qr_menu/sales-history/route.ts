import { NextRequest, NextResponse } from 'next/server';
import { KITCHEN_ORDERS_DATA } from '@/lib/kitchenOrdersStore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date_filter = searchParams.get('date_filter') || 'all_time';

  const orders = KITCHEN_ORDERS_DATA;
  const total_orders = orders.length;
  const total_sales_inr = orders.reduce((sum, o) => sum + o.total_price, 0);
  const delivered_count = orders.filter(o => o.status === 'Delivered').length;
  const pending_count = orders.filter(o => o.status !== 'Delivered').length;

  const top_dishes = [
    { name: "Royal Butter Chicken (Murgh Makhani)", quantity: 18, revenue: 10080.0, category: "Indian Mains" },
    { name: "Awadhi Dum Gosht Biryani", quantity: 14, revenue: 8960.0, category: "Biryani & Rice" },
    { name: "Murgh Malai Tikka", quantity: 12, revenue: 5760.0, category: "Starters" },
    { name: "Tandoori Garlic & Butter Naan Basket", quantity: 35, revenue: 4900.0, category: "Breads" }
  ];

  return NextResponse.json({
    date_filter,
    total_orders,
    total_sales_inr,
    delivered_count,
    pending_count,
    top_dishes,
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
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
