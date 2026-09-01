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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const channelId = parseInt(params.id, 10);
    const body = await req.json();

    const ch = initialOtaChannels.find(c => c.id === channelId);
    if (!ch) {
      return NextResponse.json({ detail: 'Channel not found' }, { status: 404 });
    }

    if (body.name) ch.name = body.name;
    if (body.code) ch.code = body.code.toUpperCase();
    if (body.channel_type) ch.channel_type = body.channel_type;
    if (body.commission_percent !== undefined) ch.commission_percent = Number(body.commission_percent);
    if (body.rate_plan) ch.rate_plan = body.rate_plan;
    if (body.auto_confirm !== undefined) ch.auto_confirm = body.auto_confirm;

    return NextResponse.json({
      channel: ch,
      channels: initialOtaChannels
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Error updating channel' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const channelId = parseInt(params.id, 10);
  const idx = initialOtaChannels.findIndex(c => c.id === channelId);
  if (idx !== -1) {
    initialOtaChannels.splice(idx, 1);
  }

  return NextResponse.json({
    channels: initialOtaChannels
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
