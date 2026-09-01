import { NextRequest, NextResponse } from 'next/server';
import { bulkUpdateRates } from '@/lib/rateCalendarStore';

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { room_type_id, rate_plan_id, start_date, end_date, rate } = body;

    const targetRate = Number(rate || 6500);
    bulkUpdateRates(room_type_id, rate_plan_id, start_date, end_date, targetRate);

    return NextResponse.json({
      status: "success",
      message: `Bulk rates updated to ₹${targetRate.toLocaleString('en-IN')} for date range ${start_date} to ${end_date} across all connected OTAs!`
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Error processing bulk rate update' }, { status: 500 });
  }
}
