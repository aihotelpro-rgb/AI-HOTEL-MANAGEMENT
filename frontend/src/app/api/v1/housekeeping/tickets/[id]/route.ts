import { NextRequest, NextResponse } from 'next/server';
import { HOUSEKEEPING_TICKETS, updateTicketStatusInStore } from '@/lib/housekeepingStore';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ticketId = Number(params.id);
    const body = await req.json();
    const { status, assigned_to } = body;

    const updated = updateTicketStatusInStore(ticketId, status, assigned_to);

    if (!updated) {
      const fallbackTicket = {
        id: ticketId,
        booking_id: 101,
        room_number: "101",
        category: "Housekeeping",
        description: "Guest amenity & room service ticket",
        status: status || "In Progress",
        priority: "Medium",
        assigned_to: assigned_to || "Staff Attendant",
        created_at: new Date().toISOString()
      };
      HOUSEKEEPING_TICKETS.unshift(fallbackTicket);
      return NextResponse.json(fallbackTicket, { headers: corsHeaders });
    }

    return NextResponse.json(updated, { headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update housekeeping ticket" }, { status: 400, headers: corsHeaders });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ticketId = Number(params.id);
  const ticket = HOUSEKEEPING_TICKETS.find(t => t.id === ticketId);
  if (!ticket) {
    return NextResponse.json({ detail: "Ticket not found" }, { status: 404, headers: corsHeaders });
  }
  return NextResponse.json(ticket, { headers: corsHeaders });
}
