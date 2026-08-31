import { NextRequest, NextResponse } from 'next/server';
import { saveWebRTCSignal, getWebRTCSignals } from '../store';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

// POST /api/v1/intercom/signal
// Submits a WebRTC signal (offer, answer, or ICE candidate)
// Body: { call_id: string, sender: 'caller' | 'receiver', type: 'offer' | 'answer' | 'candidate', payload: any }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { call_id, sender, type, payload } = body;

  if (!call_id || !sender || !type || !payload) {
    return NextResponse.json(
      { error: 'call_id, sender, type, and payload are required' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  saveWebRTCSignal(call_id, sender, type, payload);

  return NextResponse.json({ success: true, call_id, sender, type }, { status: 200, headers: CORS_HEADERS });
}

// GET /api/v1/intercom/signal?call_id=xxx
// Retrieves WebRTC offer, answer, and ICE candidates for the specified call
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const callId = searchParams.get('call_id');

  if (!callId) {
    return NextResponse.json({ error: 'call_id parameter required' }, { status: 400, headers: CORS_HEADERS });
  }

  const signals = getWebRTCSignals(callId);
  return NextResponse.json(signals, { status: 200, headers: CORS_HEADERS });
}
