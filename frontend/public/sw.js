const CACHE_NAME = 'ai-hos-pwa-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/room-qr',
  '/reception',
  '/kitchen',
  '/runner',
  '/manifest.json',
  '/favicon.ico'
];

// 1. Install Event - Pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[AI-HOS Service Worker] Pre-caching offline assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[AI-HOS Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Event - Network First with Cache Fallback for Static Assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Ignore non-http/https requests
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;

  // NEVER intercept or cache API requests (FastAPI backend /api/)
  if (url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(() => {
        console.log('[AI-HOS Service Worker] Network failure, serving static asset from cache...');
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return caches.match('/');
        });
      })
  );
});

// 4. Push Event - Background Intercom Calling & Room Service Alerts
self.addEventListener('push', (event) => {
  let data = { 
    title: '📲 Incoming Front Desk Intercom Call', 
    body: 'Front Desk Reception Ext 100 is calling your suite. Tap to answer.', 
    room: '204' 
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [300, 100, 300, 100, 300, 100, 600],
    tag: 'intercom-incoming-call',
    renotify: true,
    requireInteraction: true,
    data: {
      url: `/room-qr?room=${data.room || '204'}&auto_answer=true`
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 5. Notification Click Event - Opens/focuses the Guest In-Room App Tab directly into active call
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/room-qr';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/room-qr') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
