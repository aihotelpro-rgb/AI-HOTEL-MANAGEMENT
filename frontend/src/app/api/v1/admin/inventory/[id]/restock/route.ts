import { NextRequest, NextResponse } from 'next/server';
import { INVENTORY_ITEMS } from '../../route';

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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const itemId = parseInt(params.id, 10);
    const body = await req.json();
    const addQty = Number(body.quantity || 15.0);

    const item = INVENTORY_ITEMS.find(i => i.id === itemId);
    if (item) {
      item.stock_quantity += addQty;
    }

    return NextResponse.json({
      status: "success",
      message: `Restocked +${addQty} units successfully!`,
      item
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Error restocking item' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  return POST(req, context);
}
