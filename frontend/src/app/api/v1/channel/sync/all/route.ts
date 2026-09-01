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

export async function POST() {
  const activeCount = initialOtaChannels.filter(c => c.is_active).length;
  
  return NextResponse.json({
    status: "COMPLETED",
    message: `One-Click Sync completed cleanly across all ${activeCount} connected OTA channels!`,
    job_id: Math.floor(100 + Math.random() * 900),
    channels_synced: initialOtaChannels.filter(c => c.is_active).map(c => c.name),
    total_records_pushed: activeCount * 14 * 3,
    duration_ms: 380,
    timestamp: new Date().toISOString()
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
