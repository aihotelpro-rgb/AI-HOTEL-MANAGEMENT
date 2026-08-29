import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const HOTEL_SETTINGS = {
  id: 1,
  hotel_name: "Hotel Blue Bird Inn",
  tagline: "Luxury Island Hospitality & AI Automation",
  logo_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300",
  banner_url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200",
  currency_symbol: "₹",
  currency_code: "INR",
  gstin: "35AAAAA0000A1Z5",
  gst_percent: 12.0,
  phone: "+91 94342 80000",
  email: "reservations@hotelbluebirdnest.com",
  address: "Garacharma, Sri Vijayapuram, Andaman and Nicobar Islands 744105",
  wifi_ssid: "BlueBirdInn-HighSpeed",
  wifi_password: "Andaman@2026",
  total_rooms: 24,
  total_floors: 2,
  intercom_enabled: true,
  intercom_reception_extension: "100"
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
