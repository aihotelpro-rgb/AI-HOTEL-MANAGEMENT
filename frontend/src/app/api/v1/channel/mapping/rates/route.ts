import { NextRequest, NextResponse } from 'next/server';
import { rateMappings } from '@/lib/otaStore';

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

export async function GET() {
  return NextResponse.json(rateMappings, {
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
    const newMapping = {
      id: rateMappings.length + 1,
      pms_rate_plan: body.pms_rate_plan || "Best Available Rate (BAR)",
      pms_rate_code: body.pms_rate_code || "BAR",
      ota_name: body.ota_name || "Booking.com Global",
      ota_code: body.ota_code || "BDC",
      ota_rate_plan_code: body.ota_rate_plan_code || "OTA_BAR_01",
      ota_rate_plan_name: body.ota_rate_plan_name || "OTA Standard BAR",
      is_active: true
    };
    rateMappings.push(newMapping);
    return NextResponse.json({ status: "success", message: "Rate Plan Mapping created successfully!", mapping: newMapping }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Error creating rate mapping' }, { status: 500 });
  }
}
