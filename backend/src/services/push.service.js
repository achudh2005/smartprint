/**
 * Web Push Notification Service
 * Sends browser push notifications to customers via Web Push Protocol
 */
const webpush = require('web-push');
const { prisma } = require('../database/client');
const logger = require('../utils/logger');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BDMjsliSiVDH_w96McwUDBkaG7voQfdhf_v-tveh2MfotfX5SSMOqpYoxrQhzXgiGRLsDISxuSnZBbkA52TcBc0';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'gJrgTiuerCD91g4V6KVVcmUZInMz0qL5-zMvxJDoaUo';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@smartprint.com';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  logger.info('[WebPush] VAPID details configured successfully.');
} catch (err) {
  logger.warn('[WebPush] Failed to set VAPID details:', err.message);
}

/**
 * Save or update customer push subscription for an active session
 */
async function saveSubscription(sessionId, { endpoint, keys }) {
  if (!sessionId || !endpoint || !keys?.p256dh || !keys?.auth) {
    const err = new Error('Invalid push subscription payload');
    err.statusCode = 400;
    throw err;
  }

  const cleanEndpoint = String(endpoint).trim();
  const cleanP256dh = String(keys.p256dh).trim();
  const cleanAuth = String(keys.auth).trim();

  const subscription = await prisma.customerPushSubscription.upsert({
    where: { endpoint: cleanEndpoint },
    update: {
      customerSessionId: sessionId,
      p256dh: cleanP256dh,
      auth: cleanAuth,
    },
    create: {
      customerSessionId: sessionId,
      endpoint: cleanEndpoint,
      p256dh: cleanP256dh,
      auth: cleanAuth,
    },
  });

  logger.info(`[WebPush] Push subscription saved for session #${sessionId}`);
  return subscription;
}

/**
 * Dispatch web-push notification to all customer subscriptions linked to an order
 */
async function sendOrderPushNotification(order, { title, body, type = 'TEXT', url = '' }) {
  if (!order || !order.sessionId) return { sent: 0, failed: 0 };

  const subscriptions = await prisma.customerPushSubscription.findMany({
    where: { customerSessionId: order.sessionId },
  });

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const payload = JSON.stringify({
    title: title || order.shop?.name || 'SmartPrint Update',
    body: body || 'New message from print shop.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: `smartprint-order-${order.orderNumber}`,
    data: {
      url: url || `/orders/${order.orderNumber}`,
      orderNumber: order.orderNumber,
      orderId: order.id,
      type,
    },
  });

  const options = {
    TTL: 60 * 60 * 24, // 24 hours
    urgency: type === 'CALL_REQUEST' ? 'high' : 'normal',
  };

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, payload, options);
      sent++;
    } catch (err) {
      failed++;
      logger.warn(`[WebPush] Delivery failed for endpoint ${sub.endpoint.slice(0, 30)}...: ${err.statusCode || err.message}`);

      // If subscription expired or revoked (404 Not Found or 410 Gone), delete it
      if (err.statusCode === 404 || err.statusCode === 410) {
        await prisma.customerPushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        logger.info(`[WebPush] Removed expired subscription #${sub.id}`);
      }
    }
  }

  logger.info(`[WebPush] Push notifications dispatched for Order #${order.orderNumber}: ${sent} sent, ${failed} failed.`);
  return { sent, failed };
}

module.exports = {
  saveSubscription,
  sendOrderPushNotification,
  VAPID_PUBLIC_KEY,
};
