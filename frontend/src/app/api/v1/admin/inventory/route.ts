import { NextRequest, NextResponse } from 'next/server';
import { INVENTORY_ITEMS, getInventoryByProperty } from '@/lib/inventoryStore';

export const dynamic = 'force-dynamic';

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const property_id = Number(searchParams.get('property_id') || 0);

  const inventory = getInventoryByProperty(property_id);

  return NextResponse.json(inventory, {
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
    const property_id = Number(body.property_id || 1);
    
    const newItem = {
      id: INVENTORY_ITEMS.length + 1,
      property_id: property_id,
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
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
