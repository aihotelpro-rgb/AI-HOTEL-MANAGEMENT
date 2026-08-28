import { getQueuedRequests, removeQueuedRequest, OfflineRequest } from './db';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (
  typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? 'https://ai-hotel-backend-rfhl.onrender.com'
    : 'http://localhost:8000'
);

// Check if window is defined (for server side rendering safety)
const isClient = typeof window !== 'undefined';

export function getAuthToken(): string | null {
  return isClient ? localStorage.getItem('aihos_token') : null;
}

export function setAuthToken(token: string, role: string, username: string) {
  if (isClient) {
    localStorage.setItem('aihos_token', token);
    localStorage.setItem('aihos_role', role);
    localStorage.setItem('aihos_username', username);
  }
}

export function clearAuthToken() {
  if (isClient) {
    localStorage.removeItem('aihos_token');
    localStorage.removeItem('aihos_role');
    localStorage.removeItem('aihos_username');
  }
}

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401 && isClient) {
        clearAuthToken();
      }
      const errData = await response.json().catch(() => ({ detail: 'API request failed' }));
      throw new Error(errData.detail || 'API request failed');
    }

    return response.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Backend response timeout (Server waking up). Retrying...');
    }
    throw err;
  }
}

// Check network status
export function isOnline(): boolean {
  return isClient ? window.navigator.onLine : true;
}

// Synchronize pending offline requests to the backend API
export async function syncOfflineRequests(): Promise<number> {
  if (!isOnline()) return 0;
  
  const requests = await getQueuedRequests();
  if (requests.length === 0) return 0;
  
  let successCount = 0;
  for (const req of requests) {
    try {
      let res;
      if (req.type === 'order') {
        res = await fetch(`${API_BASE}/api/v1/qr_menu/order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.data),
        });
      } else if (req.type === 'ticket') {
        // Post directly to whatsapp webhook simulating a guest request
        res = await fetch(`${API_BASE}/api/v1/whatsapp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.data),
        });
      }

      if (res && res.ok) {
        if (req.id !== undefined) {
          await removeQueuedRequest(req.id);
          successCount++;
        }
      }
    } catch (err) {
      console.error('Failed to sync offline item, network down again:', err);
      break; // stop trying if offline again
    }
  }
  
  return successCount;
}

// Register auto sync listener on client online events
if (isClient) {
  window.addEventListener('online', () => {
    syncOfflineRequests()
      .then((count) => {
        if (count > 0) {
          console.log(`Successfully synchronized ${count} cached offline requests.`);
        }
      })
      .catch((err) => console.error('Error in background sync:', err));
  });
}
