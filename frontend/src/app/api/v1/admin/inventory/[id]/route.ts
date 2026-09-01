import { NextRequest, NextResponse } from 'next/server';
import { INVENTORY_ITEMS } from '@/lib/inventoryStore';

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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const itemId = parseInt(params.id, 10);
    const body = await req.json();

    const item = INVENTORY_ITEMS.find(i => i.id === itemId);
    if (!item) {
      return NextResponse.json({ detail: 'Inventory item not found' }, { status: 404 });
    }

    if (body.item_name) item.item_name = body.item_name;
    if (body.category) item.category = body.category;
    if (body.stock_quantity !== undefined) item.stock_quantity = Number(body.stock_quantity);
    if (body.current_stock !== undefined) item.stock_quantity = Number(body.current_stock);
    if (body.min_threshold !== undefined) item.min_threshold = Number(body.min_threshold);
    if (body.min_alert_threshold !== undefined) item.min_threshold = Number(body.min_alert_threshold);
    if (body.unit) item.unit = body.unit;
    if (body.unit_cost !== undefined) item.unit_cost = Number(body.unit_cost);
    if (body.cost_per_unit !== undefined) item.unit_cost = Number(body.cost_per_unit);

    return NextResponse.json(item, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Error updating inventory item' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const itemId = parseInt(params.id, 10);
  const idx = INVENTORY_ITEMS.findIndex(i => i.id === itemId);
  if (idx !== -1) {
    INVENTORY_ITEMS.splice(idx, 1);
  }

  return NextResponse.json({ status: "success", message: `Inventory item ${itemId} deleted successfully` }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
