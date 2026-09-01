import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export let INVENTORY_ITEMS = [
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newItem = {
      id: INVENTORY_ITEMS.length + 1,
      item_name: body.item_name || "New Inventory Item",
      category: body.category || "General",
      stock_quantity: Number(body.stock_quantity || 100),
      min_threshold: Number(body.min_threshold || 20),
      unit: body.unit || "Units",
      unit_cost: Number(body.unit_cost || 100.0)
    };
    INVENTORY_ITEMS.push(newItem);
    return NextResponse.json(newItem, {
      status: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Error adding inventory item' }, { status: 500 });
  }
}
