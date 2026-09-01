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
  const channelId = parseInt(params.id, 10);
  const ch = initialOtaChannels.find(c => c.id === channelId);
  if (!ch) {
    return NextResponse.json({ detail: 'OTA Channel not found' }, { status: 404 });
  }

  ch.is_active = !ch.is_active;

  return NextResponse.json({
    status: 'success',
    message: `OTA Channel '${ch.name}' is now ${ch.is_active ? 'ACTIVE' : 'INACTIVE'}.`,
    is_active: ch.is_active
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function PATCH(req: NextRequest, context: { params: { id: string } }) {
  return PUT(req, context);
}
