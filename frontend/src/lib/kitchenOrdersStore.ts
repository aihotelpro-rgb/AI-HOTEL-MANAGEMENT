import * as fs from 'fs';
import * as path from 'path';

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
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __kitchenOrders: KitchenOrder[];
}

import * as os from 'os';

// ─── Dual Disk Persistence ──────────────────────────────────────────────────
const TMP_ORDERS_FILE = path.join(os.tmpdir(), 'kitchen_orders.json');
const NEXT_ORDERS_FILE = path.join(process.cwd(), '.next', 'kitchen_orders.json');

function _safeWrite(filePath: string, dataStr: string) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, dataStr, 'utf-8');
  } catch {}
}

function _saveOrdersToDisk(orders: KitchenOrder[]): void {
  try {
    const dataStr = JSON.stringify(orders, null, 2);
    _safeWrite(TMP_ORDERS_FILE, dataStr);
    _safeWrite(NEXT_ORDERS_FILE, dataStr);
  } catch {}
}

function _loadOrdersFromDisk(): KitchenOrder[] | null {
  try {
    for (const file of [NEXT_ORDERS_FILE, TMP_ORDERS_FILE]) {
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf-8');
        const parsed: KitchenOrder[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch {}
  return null;
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

function initOrders(): KitchenOrder[] {
  if (!global.__kitchenOrders || global.__kitchenOrders.length === 0) {
    const fromDisk = _loadOrdersFromDisk();
    global.__kitchenOrders = fromDisk && fromDisk.length > 0 ? fromDisk : [...SEED_ORDERS];
  }
  return global.__kitchenOrders;
}

export function getOrders(): KitchenOrder[] {
  const fromDisk = _loadOrdersFromDisk();
  if (fromDisk && fromDisk.length > 0) {
    const diskIds = new Set(fromDisk.map((o) => o.id));
    const current = initOrders();
    const memOnly = current.filter((o) => !diskIds.has(o.id));
    global.__kitchenOrders = [...fromDisk, ...memOnly];
  } else {
    initOrders();
  }
  return global.__kitchenOrders;
}

export function createOrder(body: Partial<KitchenOrder> & { items: KitchenOrderItem[] }): KitchenOrder {
  const orders = getOrders();
  const newOrder: KitchenOrder = {
    id: Date.now(),
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
  orders.unshift(newOrder);
  global.__kitchenOrders = orders;
  _saveOrdersToDisk(orders);
  return newOrder;
}

const STATUS_RANKS: Record<string, number> = {
  Pending: 1,
  Cooking: 2,
  Preparing: 2,
  Ready: 3,
  OutForDelivery: 4,
  Delivered: 5,
  Cancelled: 6,
};

export function updateOrderStatusInStore(
  orderId: number,
  status: string,
  runnerName?: string,
  eta?: number,
  cancellationReason?: string
): KitchenOrder | null {
  const orders = getOrders();
  let order = orders.find((o) => o.id === orderId);

  if (!order) {
    // Create new order entry to retain transition
    order = {
      id: orderId,
      booking_id: 1,
      room_number: '101',
      guest_name: 'Resident Guest',
      items: [{ name: 'Culinary In-Room Order', quantity: 1, price: 450 }],
      total_price: 450,
      status,
      runner_name: runnerName || null,
      estimated_minutes: status === 'Delivered' || status === 'Cancelled' ? 0 : (eta ?? 15),
      created_at: new Date().toISOString(),
      delivered_at: status === 'Delivered' ? new Date().toISOString() : null,
      cancellation_reason: status === 'Cancelled' ? (cancellationReason || 'Cancelled by Kitchen Chef') : null,
      cancelled_at: status === 'Cancelled' ? new Date().toISOString() : null,
    };
    orders.unshift(order);
  } else {
    const currRank = STATUS_RANKS[order.status] || 0;
    const nextRank = STATUS_RANKS[status] || 0;

    // Never regress a Delivered order back to active unless Cancelled
    if (nextRank >= currRank || status === 'Cancelled') {
      order.status = status;
      if (status === 'Delivered') {
        order.delivered_at = order.delivered_at || new Date().toISOString();
        order.estimated_minutes = 0;
      } else if (status === 'Cancelled') {
        order.cancellation_reason = cancellationReason || order.cancellation_reason || 'Cancelled by Kitchen Chef';
        order.cancelled_at = new Date().toISOString();
        order.estimated_minutes = 0;
      }
    }

    if (runnerName) order.runner_name = runnerName;
    if (eta !== undefined && order.status !== 'Delivered' && order.status !== 'Cancelled') {
      order.estimated_minutes = eta;
    }
  }

  _saveOrdersToDisk(orders);
  return order;
}
