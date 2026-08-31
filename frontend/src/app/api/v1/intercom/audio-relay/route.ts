import { NextRequest, NextResponse } from 'next/server';
import { saveAudioChunk, getNewAudioChunks } from '../store';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

// POST /api/v1/intercom/audio-relay
// Submits recorded audio chunk (base64) from caller or receiver microphone
// Body: { call_id: string, sender: 'caller' | 'receiver', audio: string }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { call_id, sender, audio } = body;

  if (!call_id || !sender || !audio) {
    return NextResponse.json({ error: 'call_id, sender, and audio required' }, { status: 400, headers: CORS_HEADERS });
  }

  saveAudioChunk(call_id, sender, audio);
  return NextResponse.json({ success: true }, { status: 200, headers: CORS_HEADERS });
}

// GET /api/v1/intercom/audio-relay?call_id=xxx&role=caller|receiver&last_id=0
// Polls for new incoming audio chunks from opposite party
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const callId = searchParams.get('call_id') || '';
  const role = (searchParams.get('role') || 'caller') as 'caller' | 'receiver';
  const lastId = parseInt(searchParams.get('last_id') || '0', 10);

  if (!callId) {
    return NextResponse.json({ error: 'call_id required' }, { status: 400, headers: CORS_HEADERS });
  }

  const chunks = getNewAudioChunks(callId, role, lastId);
  return NextResponse.json(chunks, { status: 200, headers: CORS_HEADERS });
}
