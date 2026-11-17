/**
 * Web Push Subscription Client Helper
 * Handles Service Worker registration, VAPID key conversion, and API registration
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
 * Register Service Worker and subscribe to Web Push notifications
 */
export async function subscribeToPushNotifications(orderIdentifier) {
  if (!isPushSupported()) {
    throw new Error('Web Push is not supported on this browser.');
  }

  // 1. Request notification permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  // 2. Register Service Worker
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;

  // 3. Subscribe with VAPID applicationServerKey
  const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  const subscriptionJson = subscription.toJSON();

  // 4. Send subscription to SmartPrint API
  await api.post(`/customer/orders/${orderIdentifier}/push-subscribe`, {
    endpoint: subscriptionJson.endpoint,
    keys: subscriptionJson.keys,
  });

  return { success: true, subscription };
}
