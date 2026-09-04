import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path || [];

  // GET /api/v1/reception/bookings/{id}/invoice
  if (path.length >= 3 && path[0] === 'bookings' && path[2] === 'invoice') {
    const bookingId = Number(path[1]);
    const url = new URL(req.url);
    url.pathname = `/api/v1/reception/bookings/${bookingId}/invoice`;
    return NextResponse.redirect(url, { status: 307 });
  }

  return NextResponse.json({ message: "Reception API Catch-All Route active" }, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ message: "Success" }, { headers: corsHeaders });
}

export async function PUT(req: NextRequest) {
  return NextResponse.json({ message: "Updated" }, { headers: corsHeaders });
}
