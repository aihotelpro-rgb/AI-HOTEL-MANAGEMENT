import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

let PROPERTIES_DATA = [
  {
    id: 1,
    name: "Hotel Blue Bird Inn",
    code: "BBN-001",
    city: "Sri Vijayapuram",
    state: "Andaman & Nicobar Islands",
    address: "Garacharma, Sri Vijayapuram, A&N Islands",
    total_rooms: 24,
    active_channels: 6,
    avg_occupancy: 88.4,
    status: "Active & Live"
  },
  {
    id: 2,
    name: "Blue Bird Palace & Spa",
    code: "BBN-002",
    city: "Havelock Island (Swaraj Dweep)",
    state: "Andaman & Nicobar Islands",
    address: "Radhanagar Beach Road, Havelock, A&N Islands",
    total_rooms: 36,
    active_channels: 5,
    avg_occupancy: 92.1,
    status: "Active & Live"
  },
  {
    id: 3,
    name: "Blue Bird Beach Resort",
    code: "BBN-003",
    city: "Neil Island (Shaheed Dweep)",
    state: "Andaman & Nicobar Islands",
    address: "Bharatpur Beach Road, Neil Island, A&N Islands",
    total_rooms: 18,
    active_channels: 4,
    avg_occupancy: 81.5,
    status: "Active & Live"
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

export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "success",
    properties: PROPERTIES_DATA
  }, {
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
    const newProp = {
      id: PROPERTIES_DATA.length + 1,
      name: body.name || `Blue Bird Resort #${PROPERTIES_DATA.length + 1}`,
      code: body.code || `BBN-00${PROPERTIES_DATA.length + 1}`,
      city: body.city || "Port Blair",
      state: body.state || "Andaman & Nicobar Islands",
      address: body.address || "Main Island Highway",
      total_rooms: Number(body.total_rooms || 20),
      active_channels: 4,
      avg_occupancy: 85.0,
      status: "Active & Live"
    };

    PROPERTIES_DATA.push(newProp);

    return NextResponse.json({
      status: "success",
      message: `Property "${newProp.name}" added to multi-property portfolio!`,
      property: newProp
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
