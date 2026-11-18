/**
 * SmartPrint Service Worker v2
 * Handles background Web Push notifications for customer order chat & urgent call requests.
 * Shows OS-level notifications even when the browser tab is closed.
 */

const SW_VERSION = 'v2.1.0';

self.addEventListener('install', (event) => {
  // Activate immediately without waiting for old SW to become idle
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all open clients so this SW controls all tabs immediately
  event.waitUntil(self.clients.claim());
});

// ─────────────────────────────────────────────────────────
// 1. Push Event: Show OS notification in the phone bar
// ─────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (err) {
    payload = {
      title: 'SmartPrint Update',
      body: event.data.text(),
    };
  }

  const isCallRequest = payload.data?.type === 'CALL_REQUEST';
  const orderNumber = payload.data?.orderNumber || '';

  const title = isCallRequest
    ? `📞 ${payload.title || 'Print Shop'} Needs to Call You!`
    : (payload.title || 'SmartPrint Update');

  const options = {
    body: payload.body || 'You have an update on your order.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    // Use a persistent tag so the notification is unique per order
    tag: `smartprint-${isCallRequest ? 'call' : 'chat'}-${orderNumber}`,
    // Always renotify — replace old notification with new alert
    renotify: true,
    // Keep notification on screen until tapped for CALL_REQUEST
    requireInteraction: isCallRequest,
    // Vibration pattern: urgent triple-buzz for call, single for message
    vibrate: isCallRequest ? [300, 100, 300, 100, 300, 100, 500] : [200, 100, 200],
    data: payload.data || {},
    // Action buttons shown in the notification shade (Android Chrome / Edge)
    actions: isCallRequest
      ? [
          { action: 'open_order', title: '👁 View Order' },
          { action: 'dismiss',    title: '✕ Dismiss' },
        ]
      : [
          { action: 'open_order', title: '💬 Open Chat' },
          { action: 'dismiss',    title: '✕ Later' },
        ],
    // High-priority channel hint for Android (Chrome >= 90)
    ...(isCallRequest ? { priority: 'high' } : {}),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─────────────────────────────────────────────────────────
// 2. Notification Click: Focus or open the order page
// ─────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Don't navigate on 'dismiss' action
  if (event.action === 'dismiss') return;

  const orderNumber = event.notification?.data?.orderNumber;
  const targetUrl = event.notification?.data?.url || (orderNumber ? `/orders/${orderNumber}` : '/');
  const fullUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. If a tab is already on the order page, focus it
      for (const client of clientList) {
        if (client.url === fullUrl && 'focus' in client) {
          return client.focus();
        }
      }

      // 2. If any SmartPrint tab is open, navigate it to the order
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'navigate' in client) {
          client.focus();
          return client.navigate(fullUrl);
        }
      }

      // 3. No tab open — open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullUrl);
      }
    })
  );
});

// ─────────────────────────────────────────────────────────
// 3. Push Subscription Change: Re-subscribe automatically
// ─────────────────────────────────────────────────────────
self.addEventListener('pushsubscriptionchange', (event) => {
  // If the browser forces a subscription rotation, re-subscribe automatically
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
    }).then((newSubscription) => {
      // Post message to open clients so they can re-register on the backend
      return self.clients.matchAll({ type: 'window' }).then((clients) => {
        for (const client of clients) {
          client.postMessage({
            type: 'PUSH_SUBSCRIPTION_CHANGED',
            subscription: newSubscription.toJSON(),
          });
        }
      });
    }).catch(() => {})
  );
});
