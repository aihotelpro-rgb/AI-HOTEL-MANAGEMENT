import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const INVENTORY_ITEMS = [
  { id: 1, item_name: "Egyptian Cotton Bath Towels (Plush 800 GSM)", category: "Housekeeping", stock_quantity: 450, min_threshold: 100, unit: "Pcs", unit_cost: 850.0 },
  { id: 2, item_name: "Royal Kashmiri Kahwa Tea Bags", category: "Kitchen & F&B", stock_quantity: 1200, min_threshold: 300, unit: "Packets", unit_cost: 45.0 },
  { id: 3, item_name: "Organic Sandalwood Room Aromatics", category: "Amenities", stock_quantity: 180, min_threshold: 50, unit: "Bottles", unit_cost: 620.0 },
  { id: 4, item_name: "Artisanal Brass Room Keys & Fobs", category: "Front Desk", stock_quantity: 65, min_threshold: 20, unit: "Units", unit_cost: 1450.0 }
];

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
  return NextResponse.json(INVENTORY_ITEMS, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
