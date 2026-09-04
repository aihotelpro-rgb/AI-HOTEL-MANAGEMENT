import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getBackendUrl(): string {
  return (
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8000'
  );
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

/**
 * PUT /api/v1/qr_menu/orders/[id]/status
 * Proxies status update to Python backend — persisted in real database.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = params.id;
  const backend = getBackendUrl();

  try {
    const body = await req.json();
    const res = await fetch(`${backend}/api/v1/qr_menu/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Backend error' }));
      return NextResponse.json(err, { status: res.status, headers: CORS_HEADERS });
    }

    const data = await res.json();
    return NextResponse.json(data, { headers: CORS_HEADERS });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Backend unreachable: ${err.message}` },
      { status: 503, headers: CORS_HEADERS }
    );
  }
}
