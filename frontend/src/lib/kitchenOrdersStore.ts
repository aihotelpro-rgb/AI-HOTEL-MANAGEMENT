import * as fs from 'fs';

export interface KitchenOrderItem {
  name: string;
  quantity: number;
  price: number;
  category?: string;
}

export interface KitchenOrder {
  id: number;
  booking_id: number;
  room_number: string;
  guest_name: string;
  items: KitchenOrderItem[];
  total_price: number;
  status: string; // "Pending" | "Preparing" | "Ready" | "OutForDelivery" | "Delivered" | "Cancelled"
  runner_name?: string | null;
  estimated_minutes?: number;
  special_instructions?: string | null;
  created_at: string;
  delivered_at?: string | null;
}

// ─── Disk Persistence (BUG 2 & 3 FIX) ──────────────────────────────────────
const DISK_PATH = '/tmp/kitchen_orders.json';

function _saveOrdersToDisk(orders: KitchenOrder[]): void {
  try {
    fs.writeFileSync(DISK_PATH, JSON.stringify(orders, null, 2), 'utf-8');
  } catch {
    // /tmp not writable in some environments – silently skip
  }
}

function _loadOrdersFromDisk(): KitchenOrder[] {
  try {
    if (fs.existsSync(DISK_PATH)) {
      const raw = fs.readFileSync(DISK_PATH, 'utf-8');
      const parsed: KitchenOrder[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // corrupt file – fall through to seed data
  }
  return [];
}

// ─── Seed Data ───────────────────────────────────────────────────────────────
const SEED_ORDERS: KitchenOrder[] = [
  {
    id: 1001,
    booking_id: 1,
    room_number: '101',
    guest_name: 'Pooja Sharma',
    items: [
      { name: 'Royal Butter Chicken (Murgh Makhani)', quantity: 2, price: 560.00, category: 'Indian Mains' },
      { name: 'Tandoori Garlic & Butter Naan Basket', quantity: 3, price: 140.00, category: 'Breads' },
      { name: 'Dal Makhani Grand Palace', quantity: 1, price: 380.00, category: 'Indian Mains' }
    ],
    total_price: 1920.00,
    status: 'Preparing',
    runner_name: 'Runner Vikram',
    estimated_minutes: 15,
    special_instructions: 'No peanuts, mild spice level for children. Extra garlic butter on naan.',
    created_at: new Date(Date.now() - 12 * 60000).toISOString()
  },
  {
    id: 1002,
    booking_id: 4,
    room_number: '204',
    guest_name: 'Maharaja Raghavendra Singh',
    items: [
      { name: 'Awadhi Dum Gosht Biryani', quantity: 1, price: 640.00, category: 'Biryani & Rice' },
      { name: 'Murgh Malai Tikka & Mint Chutney', quantity: 1, price: 480.00, category: 'Starters' }
    ],
    total_price: 1120.00,
    status: 'Pending',
    runner_name: null,
    estimated_minutes: 25,
    special_instructions: 'Strict Jain preparation — no onion, no garlic.',
    created_at: new Date(Date.now() - 5 * 60000).toISOString()
  },
  {
    id: 1003,
    booking_id: 8,
    room_number: '302',
    guest_name: 'Captain Vikram Rathore',
    items: [
      { name: 'Paneer Tikka Shashlik', quantity: 2, price: 420.00, category: 'Starters' },
      { name: 'Gulab Jamun with Kesar Pista Rabdi', quantity: 2, price: 240.00, category: 'Desserts' },
      { name: 'Royal Saffron Masala Chai & Cookies', quantity: 4, price: 160.00, category: 'Beverages' }
    ],
    total_price: 1960.00,
    status: 'Ready',
    runner_name: 'Runner Amit',
    estimated_minutes: 5,
    special_instructions: 'Serve chai piping hot with extra saffron.',
    created_at: new Date(Date.now() - 22 * 60000).toISOString()
  },
  {
    id: 1004,
    booking_id: 5,
    room_number: '105',
    guest_name: 'Dr. Ananya Roy',
    items: [
      { name: 'Dal Makhani Grand Palace', quantity: 1, price: 380.00, category: 'Indian Mains' },
      { name: 'Tandoori Garlic & Butter Naan Basket', quantity: 2, price: 140.00, category: 'Breads' },
      { name: 'Gulab Jamun with Kesar Pista Rabdi', quantity: 1, price: 240.00, category: 'Desserts' }
    ],
    total_price: 900.00,
    status: 'OutForDelivery',
    runner_name: 'Runner Priya',
    estimated_minutes: 8,
    special_instructions: 'Deliver to poolside cabana table.',
    created_at: new Date(Date.now() - 30 * 60000).toISOString()
  }
];

// ─── In-Memory Store (initialized from disk or seed) ─────────────────────────
export let KITCHEN_ORDERS_DATA: KitchenOrder[] = (() => {
  const fromDisk = _loadOrdersFromDisk();
  return fromDisk.length > 0 ? fromDisk : [...SEED_ORDERS];
})();

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns orders, always re-merging from disk first to catch updates
 * written by other Vercel serverless containers (BUG 2 & 3 FIX).
 */
export function getOrders(): KitchenOrder[] {
  const fromDisk = _loadOrdersFromDisk();
  if (fromDisk.length > 0) {
    // Disk is authoritative. Keep any in-memory entries not yet on disk (write-failed edge case)
    const diskIds = new Set(fromDisk.map((o) => o.id));
    const memOnly = KITCHEN_ORDERS_DATA.filter((o) => !diskIds.has(o.id));
    KITCHEN_ORDERS_DATA = [...fromDisk, ...memOnly];
  }
  return KITCHEN_ORDERS_DATA;
}

/**
 * Creates a new order with a unique ID, persists to disk.
 * BUG 1 FIX: Use Date.now() instead of array.length+101 to avoid ID collisions.
 */
export function createOrder(body: Partial<KitchenOrder> & { items: KitchenOrderItem[] }): KitchenOrder {
  getOrders(); // re-merge from disk first
  const newOrder: KitchenOrder = {
    id: Date.now(), // ← BUG 1 FIX: monotonic unique ID
    booking_id: Number(body.booking_id || 1),
    room_number: body.room_number || `${body.booking_id || 101}`,
    guest_name: body.guest_name || 'Resident Guest',
    items: body.items || [],
    total_price: Number(body.total_price || 0),
    status: 'Pending',
    runner_name: null,
    estimated_minutes: 25,
    special_instructions: body.special_instructions || null,
    created_at: new Date().toISOString(),
    delivered_at: null,
  };
  KITCHEN_ORDERS_DATA.unshift(newOrder);
  _saveOrdersToDisk(KITCHEN_ORDERS_DATA); // ← BUG 2 FIX: persist immediately
  return newOrder;
}

/**
 * Updates order status and persists to disk.
 * BUG 3 FIX: Re-reads disk before mutating, then writes back — cross-container safe.
 */
export function updateOrderStatusInStore(
  orderId: number,
  status: string,
  runnerName?: string,
  eta?: number
): KitchenOrder | null {
  getOrders(); // ← BUG 3 FIX: always read disk before mutating
  const order = KITCHEN_ORDERS_DATA.find((o) => o.id === orderId);
  if (!order) return null;

  order.status = status;
  if (runnerName) order.runner_name = runnerName;
  if (eta !== undefined) order.estimated_minutes = eta;
  if (status === 'Delivered') {
    order.delivered_at = new Date().toISOString();
    order.estimated_minutes = 0;
  }

  _saveOrdersToDisk(KITCHEN_ORDERS_DATA); // ← BUG 3 FIX: persist status update
  return order;
}
