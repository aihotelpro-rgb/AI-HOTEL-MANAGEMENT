import { NextRequest, NextResponse } from 'next/server';
import { RATE_CALENDAR_STORE, updateSingleRate } from '@/lib/rateCalendarStore';

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
  return NextResponse.json(RATE_CALENDAR_STORE, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { room_type_id, rate_plan_id, date_str, rate } = body;

    const newRate = Number(rate || 5500);
    updateSingleRate(room_type_id, rate_plan_id, date_str, newRate);

    return NextResponse.json({
      status: "success",
      message: `Rate for ${date_str || 'selected date'} updated to ₹${newRate.toLocaleString('en-IN')}`
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Error updating rate' }, { status: 500 });
  }
}
