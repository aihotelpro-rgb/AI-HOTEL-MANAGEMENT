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
  return NextResponse.json(
    {
      stay_details: {
        booking_id: 1,
        guest_name: "Maharaja Raghavendra Singh",
        room_number: "204",
        room_type: "Super Deluxe Sea Breeze",
        check_in: new Date().toISOString(),
        check_out: new Date(Date.now() + 86400000 * 3).toISOString()
      },
      financial_summary: {
        subtotal: 16500.0,
        total_gst: 1980.0,
        grand_total: 18480.0
      },
      charges: [
        { charge_type: "Room", description: "Super Deluxe Sea Breeze (3 Nights)", amount: 16500.0, is_paid: false }
      ]
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { status: "success", message: "Booking updated successfully" },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}

export async function DELETE(req: NextRequest) {
  return NextResponse.json(
    { status: "cancelled", message: "Booking cancelled successfully" },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}
