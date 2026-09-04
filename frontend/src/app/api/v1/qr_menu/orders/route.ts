import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * PERSISTENT STORAGE FIX:
 * 
 * All kitchen order reads/writes proxy to the Python FastAPI backend on Render.com
 * which has a real persistent database (SQLite/PostgreSQL).
 * 
 * The backend URL is resolved from:
 *   1. BACKEND_API_URL env var (set in Vercel project settings, server-side only)
 *   2. NEXT_PUBLIC_API_URL env var (fallback)
 *   3. http://localhost:8000 (local dev fallback)
 */
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const backend = getBackendUrl();

  // Forward query params (booking_id, status)
  const qs = searchParams.toString();
  const backendUrl = `${backend}/api/v1/qr_menu/orders${qs ? `?${qs}` : ''}`;

  try {
    const res = await fetch(backendUrl, {
      headers: { 'Content-Type': 'application/json' },
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

export async function POST(req: NextRequest) {
  const backend = getBackendUrl();

  try {
    const body = await req.json();
    const res = await fetch(`${backend}/api/v1/qr_menu/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Backend error' }));
      return NextResponse.json(err, { status: res.status, headers: CORS_HEADERS });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 201, headers: CORS_HEADERS });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Backend unreachable: ${err.message}` },
      { status: 503, headers: CORS_HEADERS }
    );
  }
}
