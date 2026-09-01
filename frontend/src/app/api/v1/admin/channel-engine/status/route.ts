import { NextRequest, NextResponse } from 'next/server';
import { initialOtaChannels } from '@/lib/otaStore';

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
  return NextResponse.json({
    is_enabled: true,
    channel_api_key: "aihos_channel_secret_2026",
    last_sync: new Date().toISOString(),
    channels: initialOtaChannels
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const is_enabled = body.is_enabled !== undefined ? body.is_enabled : true;
    return NextResponse.json({
      config: {
        is_enabled,
        channel_api_key: "aihos_channel_secret_2026",
        last_sync: new Date().toISOString(),
        channels: initialOtaChannels
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Error updating status' }, { status: 500 });
  }
}
