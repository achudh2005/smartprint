/**
 * SmartPrint Service Worker
 * Handles background Web Push notifications for customer order chat & call requests
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 1. Push Event Listener: Receives push message and displays native OS notification
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

  const title = payload.title || 'SmartPrint Update';
  const options = {
    body: payload.body || 'You have an update on your order.',
    icon: payload.icon || '/favicon.ico',
    badge: payload.badge || '/favicon.ico',
    tag: payload.tag || 'smartprint-order-notification',
    renotify: true,
    data: payload.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: payload.data?.type === 'CALL_REQUEST',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 2. Notification Click Listener: Focuses or opens the relevant Order Confirmation page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open with the order page, focus it
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // If another SmartPrint tab is open, navigate it
      if (clientList.length > 0 && 'navigate' in clientList[0]) {
        clientList[0].focus();
        return clientList[0].navigate(targetUrl);
      }
      // Otherwise open a new window/tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
