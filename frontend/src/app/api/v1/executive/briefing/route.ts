import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BRIEFING_TEXT = `# 👑 Executive Morning Briefing
*Hotel Blue Bird Inn • Garacharma, Sri Vijayapuram, Andaman & Nicobar Islands*

## 📊 Daily Performance Summary
- **Hotel Inventory**: 24 Deluxe Island Suites across 2 Floors (12 Rooms/Floor)
- **Occupancy Rate**: 91.7% (22 of 24 Rooms Occupied)
- **RevPAR (Revenue per Available Room)**: ₹4,125.00
- **ADR (Average Daily Rate)**: ₹4,500.00
- **Daily Turnover**: ₹99,000.00 (Room Accommodations + Island F&B Dining)

## 📞 Intercom System Status
- **Ext 100 (Front Desk Console)**: 100% Online & Active
- **Suite Extensions (Ext 101 – 212)**: 24 Lines Registered via VoIP Speed Dial
- **Intercom Health Check**: Clean audio signal on all 2 floors

## 🌟 VIP Guests & Notable Arrivals
- **Maharaja Raghavendra Singh** (Room 204) — Royal Sea Breeze Check-In. Intercom VoIP Speed Dial active.
- **Pooja Sharma** (Room 101) — Executive Guest.

## 🍽️ Kitchen KDS & Island Dining
- **Active Orders Queue**: 1 Order in Preparation (Andaman Fresh Catch Fish Curry).
- **Average Food Delivery Time**: 14.2 minutes.

## 🧹 Housekeeping & Facilities
- **Matrix**: 22 Suites Inspected & Clean, 2 Suites Under Turnover.
- **Surveillance**: 4K UHD Cameras Active across Ground Archway & Floor 1-2 Corridors.`;

const EXECUTIVE_BRIEFING = {
  date: new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
  hotel_name: "Hotel Blue Bird Inn",
  location: "Garacharma, Sri Vijayapuram, Andaman and Nicobar Islands",
  total_rooms: 24,
  total_floors: 2,
  occupancy_rate: 91.7,
  rev_par: 4125.0,
  revpar: 4125.0,
  adr: 4500.0,
  total_revenue: 99000.0,
  room_revenue: 82500.0,
  dining_revenue: 16500.0,
  open_tickets_count: 1,
  active_orders_count: 1,
  briefing_text: BRIEFING_TEXT,
  sentiment_score: 99,
  sentiment_summary: "Guests rate island dining and instant 1-click intercom speed dial 99% positive.",
  pricing_recommendation: "Maintain ₹4,500 ADR rate for Deluxe Island King & Sea Breeze Suites."
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
