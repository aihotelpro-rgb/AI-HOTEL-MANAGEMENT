import { NextRequest, NextResponse } from 'next/server';
import { HOUSEKEEPING_TICKETS } from '@/lib/housekeepingStore';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET() {
  return NextResponse.json(HOUSEKEEPING_TICKETS, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newTicket = {
      id: HOUSEKEEPING_TICKETS.length + 1,
      booking_id: Number(body.booking_id || 101),
      room_number: body.room_number || "101",
      category: body.category || "Housekeeping",
      description: body.description || "Housekeeping request",
      status: "Pending",
      priority: body.priority || "Medium",
      assigned_to: body.assigned_to || "Housekeeping Staff",
      created_at: new Date().toISOString()
    };
    HOUSEKEEPING_TICKETS.unshift(newTicket);
    return NextResponse.json(newTicket, { status: 201, headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400, headers: corsHeaders });
  }
}
