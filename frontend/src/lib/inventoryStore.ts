export interface InventoryItem {
  id: number;
  property_id: number;
  item_name: string;
  category: string;
  stock_quantity: number;
  min_threshold: number;
  unit: string;
  unit_cost: number;
}

export let INVENTORY_ITEMS: InventoryItem[] = [
  // Property 1 (Sri Vijayapuram Main Stock)
  { id: 1, property_id: 1, item_name: "Egyptian Cotton Bath Towels (Plush 800 GSM)", category: "Housekeeping", stock_quantity: 450, min_threshold: 100, unit: "Pcs", unit_cost: 850.0 },
  { id: 2, property_id: 1, item_name: "Royal Kashmiri Kahwa Tea Bags", category: "Kitchen & F&B", stock_quantity: 1200, min_threshold: 300, unit: "Packets", unit_cost: 45.0 },
  { id: 3, property_id: 1, item_name: "Organic Sandalwood Room Aromatics", category: "Amenities", stock_quantity: 180, min_threshold: 50, unit: "Bottles", unit_cost: 620.0 },
  { id: 4, property_id: 1, item_name: "Artisanal Brass Room Keys & Fobs", category: "Front Desk", stock_quantity: 65, min_threshold: 20, unit: "Units", unit_cost: 1450.0 },

  // Property 2 (Havelock Resort Luxury Stock)
  { id: 101, property_id: 2, item_name: "Fresh Andaman Jumbo Tiger Prawns", category: "Kitchen & F&B", stock_quantity: 85, min_threshold: 25, unit: "kg", unit_cost: 1800.0 },
  { id: 102, property_id: 2, item_name: "French Spa Massage Essential Oils (Jasmine)", category: "Spa & Wellness", stock_quantity: 90, min_threshold: 20, unit: "Bottles", unit_cost: 2400.0 },
  { id: 103, property_id: 2, item_name: "Radhanagar Sunset Beach Lounge Towels", category: "Housekeeping", stock_quantity: 300, min_threshold: 80, unit: "Pcs", unit_cost: 1100.0 },

  // Property 3 (Neil Island Eco Stock)
  { id: 201, property_id: 3, item_name: "Local Organic Island Coconut Water", category: "Kitchen & F&B", stock_quantity: 250, min_threshold: 50, unit: "Coconuts", unit_cost: 50.0 },
  { id: 202, property_id: 3, item_name: "Coral Reef Snorkeling Goggles & Fins", category: "Activities & Sports", stock_quantity: 40, min_threshold: 15, unit: "Sets", unit_cost: 1950.0 },
  { id: 203, property_id: 3, item_name: "Eco-Bamboo Toiletries Kit", category: "Amenities", stock_quantity: 500, min_threshold: 100, unit: "Kits", unit_cost: 120.0 }
];

export function getInventoryByProperty(property_id: number): InventoryItem[] {
  if (!property_id || property_id === 0) {
    return INVENTORY_ITEMS;
  }
  return INVENTORY_ITEMS.filter(item => item.property_id === property_id);
}
