export interface InventoryItem {
  id: number;
  item_name: string;
  category: string;
  stock_quantity: number;
  min_threshold: number;
  unit: string;
  unit_cost: number;
}

export let INVENTORY_ITEMS: InventoryItem[] = [
  { id: 1, item_name: "Egyptian Cotton Bath Towels (Plush 800 GSM)", category: "Housekeeping", stock_quantity: 450, min_threshold: 100, unit: "Pcs", unit_cost: 850.0 },
  { id: 2, item_name: "Royal Kashmiri Kahwa Tea Bags", category: "Kitchen & F&B", stock_quantity: 1200, min_threshold: 300, unit: "Packets", unit_cost: 45.0 },
  { id: 3, item_name: "Organic Sandalwood Room Aromatics", category: "Amenities", stock_quantity: 180, min_threshold: 50, unit: "Bottles", unit_cost: 620.0 },
  { id: 4, item_name: "Artisanal Brass Room Keys & Fobs", category: "Front Desk", stock_quantity: 65, min_threshold: 20, unit: "Units", unit_cost: 1450.0 }
];
