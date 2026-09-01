export interface RoomItem {
  id: number;
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
  is_occupied: bool;
  current_guest_name?: string | null;
  intercom_extension: string;
  intercom_status: string;
}

type bool = boolean;

export let ROOMS_DATA: RoomItem[] = Array.from({ length: 24 }, (_, i) => {
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
