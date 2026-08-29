import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CALL_HISTORY_LOGS = [
  {
    id: 1001,
    call_id: "voip_call_98110",
    from_extension: "204",
    caller_name: "Maharaja Raghavendra Singh (Room 204)",
    target_extension: "100",
    target_name: "Front Desk Console",
    call_type: "Incoming",
    status: "Completed",
    duration: "01:24",
    timestamp: new Date(Date.now() - 600000).toISOString(),
    audio_codec: "Opus WebRTC HD"
  },
  {
    id: 1002,
    call_id: "voip_call_98115",
    from_extension: "100",
    caller_name: "Front Desk Receptionist",
    target_extension: "101",
    target_name: "Pooja Sharma (Room 101)",
    call_type: "Outbound",
    status: "Completed",
    duration: "00:42",
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    audio_codec: "Opus WebRTC HD"
  },
  {
    id: 1003,
    call_id: "voip_call_98120",
    from_extension: "208",
    caller_name: "Room 208 (Sea Breeze)",
    target_extension: "100",
    target_name: "Front Desk Console",
    call_type: "Incoming",
    status: "Missed",
    duration: "00:00",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    audio_codec: "Opus WebRTC HD"
  }
];

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
  return NextResponse.json(CALL_HISTORY_LOGS, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
