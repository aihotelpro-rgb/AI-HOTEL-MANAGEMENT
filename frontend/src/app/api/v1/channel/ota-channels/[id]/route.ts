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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const channelId = parseInt(params.id, 10);
  const idx = initialOtaChannels.findIndex(c => c.id === channelId);
  if (idx === -1) {
    return NextResponse.json({ detail: 'OTA Channel not found' }, { status: 404 });
  }

  const removed = initialOtaChannels.splice(idx, 1)[0];

  return NextResponse.json({
    status: 'success',
    message: `Channel '${removed.name}' removed from channel engine.`
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
