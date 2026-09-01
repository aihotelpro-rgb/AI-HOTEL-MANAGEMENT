export interface RoomItem {
  id: number;
  property_id: number;
  property_name: string;
  room_number: string;
  floor: number;
  room_type: string;
  status: string;
  price_per_night: number;
  image_url: string;
  area_sqft: number;
  bed_type: string;
  max_occupancy: string;
  view_type: string;
  amenities: string[];
  description: string;
  is_occupied: boolean;
  current_guest_name?: string | null;
  intercom_extension: string;
  intercom_status: string;
}

// Property 1: Hotel Blue Bird Inn (Garacharma, Sri Vijayapuram) - 24 Suites
const P1_ROOMS: RoomItem[] = Array.from({ length: 24 }, (_, i) => {
  const floor = Math.floor(i / 12) + 1;
  const roomIdx = (i % 12) + 1;
  const roomNum = `${floor}${roomIdx.toString().padStart(2, '0')}`;
  const isOccupied = roomNum === '101' || roomNum === '204';
  
  let rtype = "Deluxe Island King";
  let price = 4500.0;
  if (floor === 2 && roomIdx > 8) {
    rtype = "Royal Andaman Suite";
    price = 18000.0;
  } else if (floor === 2) {
    rtype = "Super Deluxe Sea Breeze";
    price = 9500.0;
  } else if (roomIdx > 8) {
    rtype = "Executive Bay View Room";
    price = 4500.0;
  }

  return {
    id: i + 1,
    property_id: 1,
    property_name: "Hotel Blue Bird Inn (Garacharma)",
    room_number: roomNum,
    floor: floor,
    room_type: rtype,
    status: isOccupied ? "Occupied" : "Clean",
    price_per_night: price,
    image_url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600",
    area_sqft: 550,
    bed_type: "Royal King Bed",
    max_occupancy: "2 Adults + 1 Child",
    view_type: "Palace Courtyard & Pool View",
    amenities: ["High-Speed Wi-Fi", "Espresso Bar", "Marble Bathtub", "Smart Automation", "Balcony"],
    description: "Authentic luxury suite with hand-carved jharokha arches, plush Italian linens, and high-speed palace connectivity.",
    is_occupied: isOccupied,
    current_guest_name: roomNum === '101' ? 'Pooja Sharma' : roomNum === '204' ? 'Maharaja Raghavendra Singh' : null,
    intercom_extension: roomNum,
    intercom_status: "Active VoIP"
  };
});

// Property 2: Blue Bird Palace & Spa (Havelock Island) - 36 Luxury Villas
const P2_ROOMS: RoomItem[] = Array.from({ length: 36 }, (_, i) => {
  const villaIdx = i + 1;
  const villaNum = `V-${300 + villaIdx}`;
  const isOccupied = villaIdx === 3 || villaIdx === 14 || villaIdx === 28;
  
  let rtype = "Radhanagar Beach Villa";
  let price = 12500.0;
  let img = "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600";
  
  if (villaIdx > 24) {
    rtype = "Oceanfront Overwater Pavilion";
    price = 35000.0;
    img = "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600";
  } else if (villaIdx > 12) {
    rtype = "Coral Reef Pool Suite";
    price = 22000.0;
    img = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600";
  }

  return {
    id: 100 + i + 1,
    property_id: 2,
    property_name: "Blue Bird Palace & Spa (Havelock Island)",
    room_number: villaNum,
    floor: Math.floor(i / 12) + 1,
    room_type: rtype,
    status: isOccupied ? "Occupied" : "Clean",
    price_per_night: price,
    image_url: img,
    area_sqft: 850,
    bed_type: "Emperor Canopy King",
    max_occupancy: "4 Adults",
    view_type: "Radhanagar Beach Sunset & Ocean View",
    amenities: ["Private Plunge Pool", "Outdoor Jacuzzi", "Butler Service", "Subsea Champagne Bar"],
    description: "Exclusive overwater and beachfront luxury villa with private plunge pool and direct lagoon access.",
    is_occupied: isOccupied,
    current_guest_name: isOccupied ? (villaIdx === 3 ? 'Captain Vikram Rathore' : 'Dr. Ananya Roy') : null,
    intercom_extension: `20${villaIdx.toString().padStart(2, '0')}`,
    intercom_status: "Active VoIP"
  };
});

// Property 3: Blue Bird Beach Resort (Neil Island) - 18 Beach Cottages
const P3_ROOMS: RoomItem[] = Array.from({ length: 18 }, (_, i) => {
  const hutIdx = i + 1;
  const hutNum = `H-${600 + hutIdx}`;
  const isOccupied = hutIdx === 2 || hutIdx === 9;
  
  let rtype = "Bharatpur Sunset Cottage";
  let price = 7500.0;
  let img = "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600";
  
  if (hutIdx > 9) {
    rtype = "Eco Beachfront Treehouse";
    price = 14000.0;
    img = "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600";
  }

  return {
    id: 200 + i + 1,
    property_id: 3,
    property_name: "Blue Bird Beach Resort (Neil Island)",
    room_number: hutNum,
    floor: 1,
    room_type: rtype,
    status: isOccupied ? "Occupied" : "Clean",
    price_per_night: price,
    image_url: img,
    area_sqft: 620,
    bed_type: "Organic Teakwood King",
    max_occupancy: "2 Adults",
    view_type: "Panoramic Coral Beach & Natural Bridge View",
    amenities: ["Open-Air Rain Shower", "Hammock Terrace", "Organic Breakfast", "Snorkeling Gear"],
    description: "Eco-chic beachfront bamboo cottage surrounded by coconut groves and crystal clear coral waters.",
    is_occupied: isOccupied,
    current_guest_name: isOccupied ? 'Siddharth & Neha Malhotra' : null,
    intercom_extension: `30${hutIdx.toString().padStart(2, '0')}`,
    intercom_status: "Active VoIP"
  };
});

export let ROOMS_DATA: RoomItem[] = [...P1_ROOMS, ...P2_ROOMS, ...P3_ROOMS];

export function getRoomsByProperty(property_id: number): RoomItem[] {
  if (!property_id || property_id === 0) {
    return ROOMS_DATA;
  }
  return ROOMS_DATA.filter(r => r.property_id === property_id);
}
