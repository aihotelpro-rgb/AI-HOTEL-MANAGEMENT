import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const HOTEL_SETTINGS = {
  id: 1,
  hotel_name: "The Grand Palace Resort & Heritage Spa",
  tagline: "5-Star Royal Luxury & AI Hospitality",
  logo_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300",
  banner_url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200",
  currency_symbol: "₹",
  currency_code: "INR",
  gstin: "07AAAAA0000A1Z5",
  gst_percent: 12.0,
  phone: "+91 98765 43210",
  email: "concierge@grandpalace.in",
  address: "1 Palace Road, Jaipur, Rajasthan 302001, India",
  wifi_ssid: "RoyalResort-HighSpeed",
  wifi_password: "Luxury@2026"
};

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
  return NextResponse.json(HOTEL_SETTINGS, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
