import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const EXECUTIVE_STATS = {
  hotel_name: "Hotel Blue Bird Inn",
  location: "Garacharma, Sri Vijayapuram, Andaman and Nicobar Islands",
  total_rooms: 24,
  total_floors: 2,
  occupied_rooms: 22,
  clean_rooms: 22,
  dirty_rooms: 2,
  occupancy_rate: 91.7,
  occupancy_percentage: 91.7,
  rev_par: 4125.0,
  revpar: 4125.0,
  adr: 4500.0,
  currency: "₹",
  total_revenue: 99000.0,
  total_revenue_inr: 99000.0,
  room_revenue: 82500.0,
  room_revenue_inr: 82500.0,
  dining_revenue: 16500.0,
  dining_revenue_inr: 16500.0,
  open_tickets_count: 1,
  active_orders_count: 1,
  sentiment_score: 99,
  sentiment_summary: "Guests at Hotel Blue Bird Inn rate island dining and instant 1-click intercom speed dial 99% positive.",
  pricing_recommendation: "Maintain ₹4,500 ADR rate for Deluxe Island King & Sea Breeze Suites due to steady Andaman ferry tourist arrivals.",
  intercom_status: "100% Online (24 Suite Extensions Registered)",
  recent_tickets: [
    { id: 1, room_number: "204", category: "Intercom Audio", description: "Intercom audio test verified with Front Desk Ext 100", priority: "Low", status: "Resolved", created_at: new Date().toISOString() }
  ],
  recent_orders: [
    { id: 101, booking_id: 1, items: [{ name: "Andaman Fresh Catch Fish Curry", quantity: 1, price: 520.0 }], total_price: 520.0, status: "Preparing", created_at: new Date().toISOString() }
  ],
  low_stock_count: 0,
  inventory_items: [
    { id: 1, item_name: "Island Linen Sets", unit: "Sets", current_stock: 120, min_alert_threshold: 30, is_low: false },
    { id: 2, item_name: "Fresh Tender Coconut Packets", unit: "Units", current_stock: 350, min_alert_threshold: 50, is_low: false }
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
