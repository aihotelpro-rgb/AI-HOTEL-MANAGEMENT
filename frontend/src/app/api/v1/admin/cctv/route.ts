import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CCTV_CAMERAS = [
  { id: 1, name: "CAM-01: Main Heritage Archway & Courtyard", location: "Entrance Gate", status: "Online", resolution: "4K UHD 60fps", stream_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800" },
  { id: 2, name: "CAM-02: Grand Lobby & Reception Matrix", location: "Main Reception", status: "Online", resolution: "4K UHD 60fps", stream_url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800" },
  { id: 3, name: "CAM-03: Royal Swimming Pool & Sun Deck", location: "Poolside Pavilion", status: "Online", resolution: "1080p HD", stream_url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800" },
  { id: 4, name: "CAM-04: Maharaja Fine Dining Kitchen KDS", location: "Central Kitchen", status: "Online", resolution: "1080p HD", stream_url: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800" }
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
  return NextResponse.json(CCTV_CAMERAS, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
