import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BRIEFING_TEXT = `# 👑 Executive Morning Briefing
*The Grand Palace Resort & Heritage Spa • Jaipur*

## 📊 Daily Performance Summary
- **Occupancy Rate**: 94.0% (47 of 50 Suites Occupied)
- **RevPAR (Revenue per Available Room)**: ₹11,280.00
- **ADR (Average Daily Rate)**: ₹12,000.00
- **Daily Projected Turnover**: ₹5,64,000.00 (Rooms + In-Room Dining)

## 🌟 VIP Guests & Notable Arrivals
- **Maharaja Raghavendra Singh** (Suite 304) — Royal Canopy Suite Check-In. Airport luxury Mercedes S-Class transfer arranged for 10:00 AM.
- **Pooja Sharma** (Suite 102) — Corporate Executive Guest. Special request for organic sandalwood aromatics.
- **Vikram Malhotra** (Suite 501) — Maharaja Penthouse Check-In (4-Night Stay).

## 🍽️ Kitchen KDS & Dining Operations
- **Active Orders Queue**: 1 Order in Preparation (Royal Butter Chicken & Garlic Naan Basket).
- **Average Preparation Time**: 16.4 minutes (Target: <20 min).
- **Top Dish**: Royal Butter Chicken (Murgh Makhani) — 24 portions ordered today.

## 🧹 Housekeeping & Facility Operations
- **Turnover Matrix**: 47 Suites Inspected & Clean, 3 Suites Under Turnover.
- **Open Staff Tickets**: 2 Active Requests (Bath Towel Delivery to Suite 304 & Espresso Machine Maintenance in Suite 102).
- **Surveillance**: 4K UHD Cameras (CAM-01 to CAM-04) 100% Operational.

## 📈 AI Dynamic Yield Optimization Directive
- **Pricing Strategy**: Increase weekend BAR rates by **+12%** for Suite Categories 300-500.
- **Market Demand Alert**: Jaipur Heritage Festival high demand detected. Projected weekend occupancy is 100%.`;

const EXECUTIVE_BRIEFING = {
  date: new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
  occupancy_rate: 94.0,
  rev_par: 11280.0,
  revpar: 11280.0,
  adr: 12000.0,
  total_revenue: 564000.0,
  room_revenue: 450000.0,
  dining_revenue: 84000.0,
  open_tickets_count: 2,
  active_orders_count: 1,
  briefing_text: BRIEFING_TEXT,
  sentiment_score: 98,
  sentiment_summary: "Guests report exceptional royal dining and seamless AI concierge response times.",
  pricing_recommendation: "Increase weekend BAR rates by +12% for Suite Categories 300-500 due to upcoming Jaipur Heritage Festival demand.",
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

export async function GET(req: NextRequest) {
  return NextResponse.json(EXECUTIVE_BRIEFING, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
