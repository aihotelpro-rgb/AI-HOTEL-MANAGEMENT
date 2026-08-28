const CACHE_NAME = 'ai-hos-pwa-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/room-qr',
  '/reception',
  '/kitchen',
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

  // Ignore non-http/https requests (e.g., chrome-extension://)
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;

  // NEVER intercept or cache API requests (FastAPI backend /api/v1/)
  if (url.includes('/api/v1/')) return;

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
