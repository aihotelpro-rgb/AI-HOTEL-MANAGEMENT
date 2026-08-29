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

const MENU_ITEMS = [
  {
    id: 1,
    name: "Murgh Malai Tikka & Mint Chutney",
    category: "Starters",
    price: 480.0,
    prep_time: "15-20 min",
    image_url: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600",
    portion_size: "Serves 1-2 (6 pcs)",
    spice_level: "Mild (🌶️)",
    calories: "380 kcal",
    allergens: ["Contains Dairy", "Contains Nuts"],
    description: "Tender chicken morsels marinated in rich cream, cashew paste, green cardamom, roasted in clay tandoor.",
    tags: ["Chef's Special", "Tandoori"]
  },
  {
    id: 2,
    name: "Paneer Tikka Shashlik",
    category: "Starters",
    price: 420.0,
    prep_time: "12-15 min",
    image_url: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600",
    portion_size: "Serves 1-2 (6 pcs)",
    spice_level: "Medium (🌶️🌶️)",
    calories: "340 kcal",
    allergens: ["Contains Dairy", "Jain Available"],
    description: "Cottage cheese cubes marinated in Kashmiri chili and ajwain, skewered with bell peppers and onions.",
    tags: ["Pure Veg", "Tandoori"]
  },
  {
    id: 3,
    name: "Royal Butter Chicken (Murgh Makhani)",
    category: "Indian Mains",
    price: 560.0,
    prep_time: "20-25 min",
    image_url: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600",
    portion_size: "Serves 2-3 (500g)",
    spice_level: "Medium (🌶️🌶️)",
    calories: "520 kcal",
    allergens: ["Contains Dairy", "Contains Nuts"],
    description: "Charcoal-grilled chicken simmered in a velvety tomato, honey, and churned butter gravy with kasuri methi.",
    tags: ["Royal Mughlai", "Mildly Spiced"]
  },
  {
    id: 4,
    name: "Dal Makhani Grand Palace",
    category: "Indian Mains",
    price: 380.0,
    prep_time: "15 min",
    image_url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600",
    portion_size: "Serves 2 (400g)",
    spice_level: "Mild (🌶️)",
    calories: "390 kcal",
    allergens: ["Contains Dairy", "Pure Veg"],
    description: "Slow-cooked black lentils simmered overnight for 24 hours with fresh cream, butter, and mild aromatic spices.",
    tags: ["Pure Veg", "Signature Dish"]
  },
  {
    id: 5,
    name: "Awadhi Dum Gosht Biryani",
    category: "Biryani & Rice",
    price: 640.0,
    prep_time: "20-25 min",
    image_url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600",
    portion_size: "Serves 1-2 (Pot)",
    spice_level: "Spicy (🌶️🌶️🌶️)",
    calories: "680 kcal",
    allergens: ["Contains Dairy", "Gluten-Free"],
    description: "Fragrant aged Basmati rice layered with succulent tender mutton, saffron, kewra water, served with Burani Raita.",
    tags: ["Chef's Recommendation", "Aromatic"]
  },
  {
    id: 6,
    name: "Tandoori Garlic & Butter Naan Basket",
    category: "Breads",
    price: 140.0,
    prep_time: "5-8 min",
    image_url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600",
    portion_size: "3 Assorted Breads",
    spice_level: "Mild (🌶️)",
    calories: "280 kcal",
    allergens: ["Contains Dairy", "Contains Gluten"],
    description: "Assortment of Garlic Naan, Butter Naan, and Laccha Paratha baked fresh in high-heat clay tandoor.",
    tags: ["Fresh from Tandoor"]
  },
  {
    id: 7,
    name: "Gulab Jamun with Kesar Pista Rabdi",
    category: "Desserts",
    price: 240.0,
    prep_time: "5 min",
    image_url: "https://images.unsplash.com/photo-1605197143984-690e2931f24d?w=600",
    portion_size: "Serves 1-2 (2 pcs)",
    spice_level: "Sweet",
    calories: "360 kcal",
    allergens: ["Contains Dairy", "Contains Nuts", "Pure Veg"],
    description: "Golden fried milk dumplings soaked in cardamom saffron syrup, paired with slow-reduced pistachio rabdi.",
    tags: ["Warm & Sweet", "Pure Veg"]
  },
  {
    id: 8,
    name: "Royal Saffron Masala Chai & Cookies",
    category: "Beverages",
    price: 160.0,
    prep_time: "5 min",
    image_url: "https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?w=600",
    portion_size: "2 Cups (Pot)",
    spice_level: "Aromatic",
    calories: "120 kcal",
    allergens: ["Contains Dairy"],
    description: "Assam black tea brewed with fresh ginger, crushed green cardamom, cinnamon, and Kashmiri saffron.",
    tags: ["Traditional", "Immunity Booster"]
  }
];

const ROOMS_MATRIX = Array.from({ length: 50 }, (_, i) => {
  const floor = Math.floor(i / 10) + 1;
  const roomNum = `${floor}${((i % 10) + 1).toString().padStart(2, '0')}`;
  const isOccupied = roomNum === '304' || roomNum === '102' || roomNum === '501';
  return {
    id: i + 1,
    room_number: roomNum,
    floor: floor,
    room_type: floor === 5 ? "Maharaja Penthouse Suite" : floor >= 3 ? "Royal Heritage Suite" : "Deluxe Heritage King",
    status: isOccupied ? "Occupied" : "Clean",
    price_per_night: floor === 5 ? 18000.0 : floor >= 3 ? 9500.0 : 5500.0,
    image_url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600",
    is_occupied: isOccupied,
    current_guest_name: roomNum === '304' ? 'Maharaja Raghavendra Singh' : roomNum === '102' ? 'Pooja Sharma' : roomNum === '501' ? 'Vikram Malhotra' : null
  };
});

async function handleApiRequest(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.pathname.replace('/api/v1/', '');

  // Auth login
  if (path.includes('auth/login')) {
    const body = await req.json().catch(() => ({}));
    const username = body.username || 'admin';
    const roleMap: Record<string, string> = {
      admin: 'Admin',
      reception: 'Reception',
      kitchen: 'Kitchen',
      housekeeping: 'Housekeeping',
      manager: 'Executive'
    };
    const role = roleMap[username.toLowerCase()] || 'Admin';
    return NextResponse.json({
      access_token: `mock_jwt_token_${Date.now()}`,
      token_type: 'bearer',
      role: role,
      username: username
    });
  }

  // Admin settings
  if (path.includes('admin/settings')) {
    return NextResponse.json(HOTEL_SETTINGS);
  }

  // Admin rooms
  if (path.includes('admin/rooms') || path.includes('reception/rooms')) {
    return NextResponse.json(ROOMS_MATRIX);
  }

  // QR Menu
  if (path === 'qr_menu' || path.includes('qr_menu/menu')) {
    return NextResponse.json(MENU_ITEMS);
  }

  // Booking by room
  if (path.includes('qr_menu/booking-by-room')) {
    const room = url.searchParams.get('room') || '304';
    return NextResponse.json({
      booking_id: 1,
      room_number: room,
      guest_name: 'Maharaja Raghavendra Singh',
      check_in: new Date().toISOString(),
      check_out: new Date(Date.now() + 86400000 * 3).toISOString(),
      is_active: true
    });
  }

  // Active orders
  if (path.includes('qr_menu/orders')) {
    return NextResponse.json([
      {
        id: 101,
        booking_id: 1,
        items: [
          { name: "Royal Butter Chicken (Murgh Makhani)", quantity: 1, price: 560.0 },
          { name: "Tandoori Garlic & Butter Naan Basket", quantity: 2, price: 140.0 }
        ],
        total_price: 840.0,
        status: "Preparing",
        special_instructions: "Mild spices please",
        created_at: new Date().toISOString()
      }
    ]);
  }

  // Folio
  if (path.includes('qr_menu/folio')) {
    return NextResponse.json({
      booking_id: 1,
      guest_name: 'Maharaja Raghavendra Singh',
      room_number: '304',
      total_amount: 20340.0,
      charges: [
        { charge_type: 'Room', description: 'Deluxe Heritage King (3 Nights)', amount: 19500.0, is_paid: false, created_at: new Date().toISOString() },
        { charge_type: 'Dining', description: 'In-Room Dining: Order #101', amount: 840.0, is_paid: false, created_at: new Date().toISOString() }
      ]
    });
  }

  // Intercom history & call
  if (path.includes('intercom/history')) {
    return NextResponse.json([
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
    ]);
  }

  if (path.includes('intercom/call')) {
    return NextResponse.json({
      status: "connected",
      call_id: `voip_call_${Date.now()}`,
      target_room: "204",
      from_extension: "100",
      caller_name: "Front Desk Console",
      target_name: "Room 204",
      audio_channel: "Opus WebRTC 48kHz HD",
      hotel: "Hotel Blue Bird Inn - Garacharma, Sri Vijayapuram",
      timestamp: new Date().toISOString()
    });
  }

  // Availability / Health check
  if (path.includes('public/availability') || path.includes('health')) {
    return NextResponse.json({
      status: "online",
      service: "Hotel Blue Bird Inn AI Suite",
      available_rooms: 22,
      total_rooms: 24
    });
  }

  // Default fallback response
  return NextResponse.json({ status: "success", path: path });
}

export async function GET(req: NextRequest) {
  return handleApiRequest(req);
}

export async function POST(req: NextRequest) {
  return handleApiRequest(req);
}

export async function PUT(req: NextRequest) {
  return handleApiRequest(req);
}

export async function DELETE(req: NextRequest) {
  return handleApiRequest(req);
}
