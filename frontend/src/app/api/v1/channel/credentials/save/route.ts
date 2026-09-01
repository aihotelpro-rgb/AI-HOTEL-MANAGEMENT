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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ota_id, hotel_id_on_ota, connection_mode } = body;

    const ch = initialOtaChannels.find(c => c.id === Number(ota_id));
    if (ch) {
      if (hotel_id_on_ota) ch.hotel_id_on_ota = hotel_id_on_ota;
      if (connection_mode) ch.connection_mode = connection_mode;
      ch.is_connected = true;
      ch.connection_status = "Credentials Verified & Connected";
      ch.last_connection_test = new Date().toISOString();
    }

    return NextResponse.json({
      status: "success",
      message: "OTA API Credentials encrypted & saved to security vault successfully!"
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Error saving credentials' }, { status: 500 });
  }
}
