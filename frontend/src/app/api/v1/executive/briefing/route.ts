import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const EXECUTIVE_BRIEFING = {
  date: new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
  occupancy_rate: "94.0%",
  revpar_inr: 11280.0,
  adr_inr: 12000.0,
  total_revenue_today_inr: 564000.0,
  ai_yield_recommendation: "Increase weekend BAR rates by +12% for Suite Categories 300-500 due to upcoming Jaipur Heritage Festival demand.",
  key_highlights: [
    "VIP Arrival: Maharaja Raghavendra Singh checked into Suite 304.",
    "KDS Dining Efficiency: Average food prep time reduced to 16.4 minutes.",
    "Housekeeping Matrix: 47 of 50 suites inspected & ready for check-in."
  ]
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
  return NextResponse.json(EXECUTIVE_BRIEFING, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
