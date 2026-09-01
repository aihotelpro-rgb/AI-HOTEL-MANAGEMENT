import { NextRequest, NextResponse } from 'next/server';

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
  const days = parseInt(searchParams.get('days') || '14', 10);

  const today = new Date();
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    dates.push(d.toISOString().split('T')[0]);
  }

  const roomTypes = [
    { id: 1, name: "Deluxe Heritage Room", code: "DHR", base_rate: 4500.0, units: 10 },
    { id: 2, name: "Royal Heritage Suite", code: "RHS", base_rate: 9500.0, units: 8 },
    { id: 3, name: "Maharaja Penthouse Suite", code: "MPS", base_rate: 18000.0, units: 6 }
  ];

  const ratePlans = [
    { id: 1, name: "Best Available Rate (BAR)", code: "BAR" },
    { id: 2, name: "Non-Refundable Saver", code: "NREF" },
    { id: 3, name: "Royal Breakfast & Spa Package", code: "PKG" }
  ];

  const grid = [];
  for (const rt of roomTypes) {
    for (const rp of ratePlans) {
      const date_values: Record<string, any> = {};
      for (const d_str of dates) {
        let mult = 1.0;
        if (rp.code === 'NREF') mult = 0.85;
        if (rp.code === 'PKG') mult = 1.25;

        date_values[d_str] = {
          rate: Math.round(rt.base_rate * mult),
          available: rt.units - 2,
          stop_sell: false,
          min_los: 1
        };
      }

      grid.push({
        room_type_id: rt.id,
        room_type_name: rt.name,
        room_type_code: rt.code,
        rate_plan_id: rp.id,
        rate_plan_name: rp.name,
        dates: date_values
      });
    }
  }

  return NextResponse.json({ dates, grid }, {
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
    const { date_str, rate } = body;
    return NextResponse.json({
      status: "success",
      message: `Rate for ${date_str || 'selected date'} updated to ₹${Number(rate || 5500).toLocaleString('en-IN')}`
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
