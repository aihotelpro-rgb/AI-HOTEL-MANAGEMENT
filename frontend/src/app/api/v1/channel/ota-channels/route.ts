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
  return NextResponse.json(initialOtaChannels, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = (body.code || 'NEW').toUpperCase();
    
    const existing = initialOtaChannels.find(c => c.code === code);
    if (existing) {
      return NextResponse.json({ detail: `OTA Channel with code ${code} already exists` }, { status: 400 });
    }

    const newChannel = {
      id: initialOtaChannels.length + 1,
      name: body.name || 'New OTA Channel',
      code: code,
      channel_type: body.channel_type || 'OTA Engine',
      api_type: body.api_type || 'REST',
      commission_percent: Number(body.commission_percent || 15.0),
      is_active: true,
      logo_url: body.logo_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100',
      hotel_id_on_ota: body.hotel_id_on_ota || `HOTEL-${code}-9912`,
      is_connected: true,
      connection_mode: 'LIVE',
      connection_status: 'Configured & Active',
      last_connection_test: new Date().toISOString(),
      rate_plan: body.rate_plan || 'BAR (Best Available Rate)',
      auto_confirm: body.auto_confirm !== undefined ? body.auto_confirm : true
    };

    initialOtaChannels.push(newChannel);

    return NextResponse.json(
      { status: 'success', message: `OTA Channel '${newChannel.name}' added successfully!`, channel: newChannel },
      {
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Error adding OTA channel' }, { status: 500 });
  }
}
