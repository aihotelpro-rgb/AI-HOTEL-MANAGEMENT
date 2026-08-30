import { NextRequest, NextResponse } from 'next/server';
import { getCallQueue, getCallHistory, expireRingingCalls, IntercomCall } from '../store';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

// GET /api/v1/intercom/status?call_id=voip_xxx
// Called by room browser to poll whether reception answered/declined their call
export async function GET(req: NextRequest) {
  expireRingingCalls();
  const { searchParams } = new URL(req.url);
  const callId = searchParams.get('call_id');

  if (!callId) {
    return NextResponse.json({ error: 'call_id param required' }, { status: 400, headers: CORS_HEADERS });
  }

  // Check active queue first
  const activeCall = getCallQueue().find((c: IntercomCall) => c.call_id === callId);
  if (activeCall) {
    return NextResponse.json(activeCall, { status: 200, headers: CORS_HEADERS });
  }

  // Check history (call may have been answered/completed/missed)
  const historyCall = getCallHistory().find((c: IntercomCall) => c.call_id === callId);
  if (historyCall) {
    return NextResponse.json(historyCall, { status: 200, headers: CORS_HEADERS });
  }

  return NextResponse.json({ error: 'call_id not found', status: 'expired' }, { status: 404, headers: CORS_HEADERS });
}
