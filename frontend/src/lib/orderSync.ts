export interface SyncOrder {
  id: number;
  booking_id: number;
  room_number?: string;
  guest_name?: string;
  items: any[];
  total_price: number;
  status: string;
  runner_name?: string | null;
  estimated_minutes?: number;
  special_instructions?: string | null;
  created_at: string;
  delivered_at?: string | null;
}

export const ORDER_STATUS_HIERARCHY: Record<string, number> = {
  Pending: 1,
  Cooking: 2,
  Preparing: 2,
  Ready: 3,
  OutForDelivery: 4,
  Delivered: 5,
  Cancelled: 6,
};

export const KDS_ORDERS_STORAGE_KEY = 'aihos_kds_orders_cache';
export const DELIVERED_ORDERS_STORAGE_KEY = 'aihos_delivered_orders';

export function getStatusRank(status?: string): number {
  if (!status) return 0;
  return ORDER_STATUS_HIERARCHY[status] ?? 0;
}

export function getDeliveredOrderIds(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELIVERED_ORDERS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.map(Number));
    }
  } catch {}
  return new Set();
}

export function markOrderDeliveredLocally(orderId: number): void {
  if (typeof window === 'undefined') return;
  try {
    const ids = getDeliveredOrderIds();
    ids.add(orderId);
    localStorage.setItem(DELIVERED_ORDERS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

export function getCachedOrders<T = SyncOrder>(): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KDS_ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as T[];
  } catch {}
  return [];
}

export function saveCachedOrders<T = SyncOrder>(orders: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KDS_ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch {}
}

/**
 * Merges newly fetched / incoming orders with locally cached orders and delivered history.
 * Monotonic Status Rule:
 * 1. An order marked 'Delivered' (or recorded in delivered history) CANNOT regress to Ready / OutForDelivery.
 * 2. Status with higher rank in hierarchy always supersedes lower rank during merges.
 */
export function mergeOrdersWithHierarchy<T extends SyncOrder>(
  incoming: T[],
  cached: T[]
): T[] {
  const deliveredSet = getDeliveredOrderIds();
  const map = new Map<number, T>();

  // Seed with cached orders
  for (const c of cached) {
    let order = { ...c };
    if (deliveredSet.has(order.id) || order.status === 'Delivered') {
      order.status = 'Delivered';
      order.estimated_minutes = 0;
      if (!order.delivered_at) order.delivered_at = new Date().toISOString();
    }
    map.set(order.id, order);
  }

  // Merge incoming
  for (const inc of incoming) {
    const existing = map.get(inc.id);
    if (!existing) {
      let order = { ...inc };
      if (deliveredSet.has(order.id) || order.status === 'Delivered') {
        order.status = 'Delivered';
        order.estimated_minutes = 0;
        if (!order.delivered_at) order.delivered_at = new Date().toISOString();
      }
      map.set(order.id, order);
    } else {
      const existingRank = getStatusRank(existing.status);
      const incomingRank = getStatusRank(inc.status);
      const isDelivered = deliveredSet.has(inc.id) || existing.status === 'Delivered' || inc.status === 'Delivered';

      let winnerStatus: string;
      if (isDelivered) {
        winnerStatus = 'Delivered';
      } else if (existingRank >= incomingRank) {
        winnerStatus = existing.status;
      } else {
        winnerStatus = inc.status;
      }

      const winnerRunner =
        existingRank >= incomingRank
          ? (existing.runner_name || inc.runner_name)
          : (inc.runner_name || existing.runner_name);

      const winnerDeliveredAt =
        isDelivered
          ? (existing.delivered_at || inc.delivered_at || new Date().toISOString())
          : (inc.delivered_at || existing.delivered_at);

      const merged: T = {
        ...inc,
        ...existing,
        // Ensure incoming updated properties (like items or prices) take effect
        items: inc.items && inc.items.length > 0 ? inc.items : existing.items,
        total_price: inc.total_price || existing.total_price,
        special_instructions: inc.special_instructions || existing.special_instructions,
        room_number: inc.room_number || existing.room_number,
        guest_name: inc.guest_name || existing.guest_name,
        status: winnerStatus,
        runner_name: winnerRunner,
        delivered_at: winnerDeliveredAt,
        estimated_minutes: winnerStatus === 'Delivered' ? 0 : (inc.estimated_minutes ?? existing.estimated_minutes ?? 10),
      };

      map.set(inc.id, merged);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
