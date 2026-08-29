import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const EXECUTIVE_STATS = {
  total_rooms: 50,
  occupied_rooms: 47,
  clean_rooms: 47,
  dirty_rooms: 3,
  occupancy_rate: 94.0,
  occupancy_percentage: 94.0,
  rev_par: 11280.0,
  revpar: 11280.0,
  adr: 12000.0,
  currency: "₹",
  total_revenue: 564000.0,
  total_revenue_inr: 564000.0,
  room_revenue: 450000.0,
  room_revenue_inr: 450000.0,
  dining_revenue: 84000.0,
  dining_revenue_inr: 84000.0,
  open_tickets_count: 2,
  active_orders_count: 1,
  sentiment_score: 98,
  sentiment_summary: "Guests report exceptional royal dining and seamless AI concierge response times.",
  pricing_recommendation: "Increase weekend BAR rates by +12% for Suite Categories 300-500 due to upcoming Jaipur Heritage Festival demand.",
  recent_tickets: [
    { id: 1, room_number: "304", category: "Amenity", description: "Guest requested 2 extra plush bath towels", priority: "Medium", status: "Pending", created_at: new Date().toISOString() },
    { id: 2, room_number: "102", category: "Maintenance", description: "Espresso machine check required", priority: "Low", status: "In Progress", created_at: new Date().toISOString() }
  ],
  recent_orders: [
    { id: 101, booking_id: 1, items: [{ name: "Royal Butter Chicken", quantity: 1, price: 560.0 }], total_price: 840.0, status: "Preparing", created_at: new Date().toISOString() }
  ],
  low_stock_count: 0,
  inventory_items: [
    { id: 1, item_name: "Egyptian Cotton Bath Towels", unit: "Pcs", current_stock: 450, min_alert_threshold: 100, is_low: false },
    { id: 2, item_name: "Kashmiri Kahwa Tea Bags", unit: "Packets", current_stock: 1200, min_alert_threshold: 300, is_low: false }
  ]
};

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

export async function GET() {
  return NextResponse.json(EXECUTIVE_STATS, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
