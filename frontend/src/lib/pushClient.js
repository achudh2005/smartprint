/**
 * Web Push Subscription Client Helper v2
 * Handles Service Worker registration, VAPID key conversion, and API registration.
 * Auto-resubscribes silently if Notification permission was already granted.
 */
import api from './api';

export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BDMjsliSiVDH_w96McwUDBkaG7voQfdhf_v-tveh2MfotfX5SSMOqpYoxrQhzXgiGRLsDISxuSnZBbkA52TcBc0';

/**
 * Convert URL-safe base64 string to Uint8Array for PushManager
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if the current browser supports Web Push & Service Workers
 */
export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Register the SmartPrint Service Worker (idempotent — safe to call on every page load)
 */
export async function registerServiceWorker() {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.warn('[SW] Service Worker registration failed:', err.message);
    return null;
  }
}

/**
 * Subscribe to Web Push notifications and register with the SmartPrint backend.
 * If called with `silent=true`, does NOT request the native permission prompt —
 * only subscribes if permission was already granted (safe to call on page load).
 */
export async function subscribeToPushNotifications(orderIdentifier, { silent = false } = {}) {
  if (!isPushSupported()) {
    if (!silent) throw new Error('Web Push is not supported on this browser.');
    return null;
  }

  // 1. Check / request notification permission
  if (Notification.permission === 'denied') {
    if (!silent) throw new Error('Notification permission was denied. Please enable it in browser settings.');
    return null;
  }

  if (Notification.permission !== 'granted') {
    if (silent) return null; // Don't show the native prompt silently
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission was not granted.');
    }
  }

  // 2. Register Service Worker
  const registration = await registerServiceWorker();
  if (!registration) {
    if (!silent) throw new Error('Could not register Service Worker.');
    return null;
  }

  // 3. Subscribe with VAPID applicationServerKey
  const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  let subscription;
  try {
    subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }
  } catch (err) {
    if (!silent) throw new Error('Failed to subscribe to push: ' + err.message);
    return null;
  }

  const subscriptionJson = subscription.toJSON();

  // 4. Send subscription to SmartPrint API
  try {
    await api.post(`/customer/orders/${orderIdentifier}/push-subscribe`, {
      endpoint: subscriptionJson.endpoint,
      keys: subscriptionJson.keys,
    });
  } catch (err) {
    if (!silent) throw err;
    return null;
  }

  // 5. Listen for SW subscription rotation and re-register automatically
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED') {
        const newSub = event.data.subscription;
        if (newSub?.endpoint && newSub?.keys) {
          api.post(`/customer/orders/${orderIdentifier}/push-subscribe`, {
            endpoint: newSub.endpoint,
            keys: newSub.keys,
          }).catch(() => {});
        }
      }
    });
  }

  return { success: true, subscription };
}
