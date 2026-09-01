export interface KitchenOrderItem {
  name: string;
  quantity: number;
  price: number;
  category?: string;
}

export interface KitchenOrder {
  id: number;
  booking_id: number;
  items: KitchenOrderItem[];
  total_price: number;
  status: string; // "Pending" | "Preparing" | "Ready" | "OutForDelivery" | "Delivered" | "Cancelled"
  runner_name?: string | null;
  estimated_minutes?: number;
  special_instructions?: string | null;
  created_at: string;
  delivered_at?: string | null;
}

export let KITCHEN_ORDERS_DATA: KitchenOrder[] = [
  {
    id: 101,
    booking_id: 1,
    items: [
      { name: "Royal Butter Chicken (Murgh Makhani)", quantity: 2, price: 560.00, category: "Indian Mains" },
      { name: "Tandoori Garlic & Butter Naan Basket", quantity: 3, price: 140.00, category: "Breads" },
      { name: "Dal Makhani Grand Palace", quantity: 1, price: 380.00, category: "Indian Mains" }
    ],
    total_price: 1920.00,
    status: "Preparing",
    runner_name: "Runner Vikram",
    estimated_minutes: 15,
    special_instructions: "No peanuts, mild spice level for children. Extra garlic butter on naan.",
    created_at: new Date(Date.now() - 12 * 60000).toISOString()
  },
  {
    id: 102,
    booking_id: 4,
    items: [
      { name: "Awadhi Dum Gosht Biryani", quantity: 1, price: 640.00, category: "Biryani & Rice" },
      { name: "Murgh Malai Tikka & Mint Chutney", quantity: 1, price: 480.00, category: "Starters" }
    ],
    total_price: 1120.00,
    status: "Pending",
    runner_name: null,
    estimated_minutes: 25,
    special_instructions: "Strict Jain preparation — no onion, no garlic.",
    created_at: new Date(Date.now() - 5 * 60000).toISOString()
  },
  {
    id: 103,
    booking_id: 8,
    items: [
      { name: "Paneer Tikka Shashlik", quantity: 2, price: 420.00, category: "Starters" },
      { name: "Gulab Jamun with Kesar Pista Rabdi", quantity: 2, price: 240.00, category: "Desserts" },
      { name: "Royal Saffron Masala Chai & Cookies", quantity: 4, price: 160.00, category: "Beverages" }
    ],
    total_price: 1960.00,
    status: "Ready",
    runner_name: "Runner Amit",
    estimated_minutes: 5,
    special_instructions: "Serve chai piping hot with extra saffron.",
    created_at: new Date(Date.now() - 22 * 60000).toISOString()
  }
];

export function updateOrderStatusInStore(orderId: number, status: string, runnerName?: string, eta?: number): KitchenOrder | null {
  const order = KITCHEN_ORDERS_DATA.find(o => o.id === orderId);
  if (!order) return null;

  order.status = status;
  if (runnerName) order.runner_name = runnerName;
  if (eta !== undefined) order.estimated_minutes = eta;
  if (status === 'Delivered') {
    order.delivered_at = new Date().toISOString();
    order.estimated_minutes = 0;
  }

  return order;
}
