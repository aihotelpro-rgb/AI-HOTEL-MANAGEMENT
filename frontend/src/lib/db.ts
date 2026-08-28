import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'ai_hos_offline_db';
const DB_VERSION = 1;

export interface OfflineRequest {
  id?: number;
  type: 'order' | 'ticket';
  data: any;
  timestamp: number;
}

export async function initDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Menu items store for offline menu browsing
      if (!db.objectStoreNames.contains('menu')) {
        db.createObjectStore('menu', { keyPath: 'id' });
      }
      // Outgoing queue store for requests made while offline
      if (!db.objectStoreNames.contains('requests')) {
        db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

// Menu caching
export async function cacheMenu(menuItems: any[]) {
  const db = await initDB();
  const tx = db.transaction('menu', 'readwrite');
  const store = tx.objectStore('menu');
  await store.clear();
  for (const item of menuItems) {
    await store.put(item);
  }
  await tx.done;
}

export async function getCachedMenu(): Promise<any[]> {
  const db = await initDB();
  return db.getAll('menu');
}

// Outgoing offline queueing
export async function queueOfflineRequest(type: 'order' | 'ticket', data: any): Promise<number> {
  const db = await initDB();
  const id = await db.add('requests', {
    type,
    data,
    timestamp: Date.now()
  });
  return id as number;
}

export async function getQueuedRequests(): Promise<OfflineRequest[]> {
  const db = await initDB();
  return db.getAll('requests');
}

export async function removeQueuedRequest(id: number) {
  const db = await initDB();
  return db.delete('requests', id);
}
