/**
 * Payment Service
 * Integrates Razorpay online gateway, counter payments, signature validation,
 * webhook processing, and shop-scoped payment audits.
 */
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { prisma } = require('../database/client');
const logger = require('../utils/logger');
const { emitToShop } = require('../socket');

/**
 * Get configured Razorpay credentials for a shop
 */
async function getShopRazorpayConfig(shopId) {
  const settings = await prisma.shopSettings.findUnique({
    where: { shopId },
  });

  const keyId = settings?.razorpayKeyId || process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key';
  const keySecret = settings?.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || 'rzp_test_mock_secret';
  const webhookSecret = settings?.razorpayWebhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_test_webhook_secret';

  return {
    paymentEnabled: settings?.paymentEnabled || false,
    keyId,
    keySecret,
    webhookSecret,
  };
}

/**
 * Create a Razorpay Order for customer checkout
 */
async function createRazorpayOrder(orderId) {
  const where = typeof orderId === 'number'
    ? { id: orderId }
    : (!isNaN(Number(orderId)) ? { id: Number(orderId) } : { orderNumber: orderId });

  const order = await prisma.order.findFirst({
    where,
    include: { shop: { include: { shopSettings: true } } },
  });

  if (!order) {
    const err = new Error('Order not found.');
    err.statusCode = 404;
    throw err;
  }

  const { paymentEnabled, keyId, keySecret } = await getShopRazorpayConfig(order.shopId);

  if (!paymentEnabled) {
    const err = new Error('Online payments are not enabled for this shop. Please pay at the counter.');
    err.statusCode = 400;
    throw err;
  }

  const amountInPaise = Math.round(Number(order.totalAmount) * 100);
  if (amountInPaise <= 0) {
    const err = new Error('Order amount must be greater than zero.');
    err.statusCode = 400;
    throw err;
  }

  let razorpayOrderId = null;

  // Use real Razorpay SDK if valid production/live credentials exist, or deterministic simulation
  const isSimulated = process.env.NODE_ENV === 'test' ||
    process.env.RAZORPAY_MOCK === 'true' ||
    keyId.includes('mock') ||
    keySecret.includes('mock') ||
    keyId.includes('test') ||
    keySecret.includes('test');

  if (keyId && keySecret && !isSimulated) {
    try {
      const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
      const rzpOrder = await rzp.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: order.orderNumber,
        notes: {
          orderId: order.id.toString(),
          orderNumber: order.orderNumber,
          shopId: order.shopId.toString(),
        },
      });
      razorpayOrderId = rzpOrder.id;
    } catch (rzpErr) {
      const errMsg = rzpErr.error?.description || rzpErr.message || 'Razorpay Gateway Error';
      logger.error(`[Razorpay] Order creation failed: ${errMsg}`);
      if (process.env.NODE_ENV !== 'production') {
        razorpayOrderId = `order_${crypto.randomBytes(10).toString('hex')}`;
        logger.info(`[Razorpay/Fallback] Created test order ${razorpayOrderId} after gateway response: ${errMsg}`);
      } else {
        const err = new Error(`Payment gateway error: ${errMsg}`);
        err.statusCode = 502;
        throw err;
      }
    }
  } else {
    // Development / test fallback order ID
    razorpayOrderId = `order_${crypto.randomBytes(10).toString('hex')}`;
    logger.info(`[Razorpay/Mock] Created simulated order ${razorpayOrderId} for ${order.orderNumber}`);
  }

  // Create payment record in database
  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      amount: order.totalAmount,
      method: 'RAZORPAY',
      status: 'PENDING',
      razorpayOrderId,
      referenceId: razorpayOrderId,
    },
  });

  return {
    success: true,
    keyId,
    razorpayOrderId,
    amount: amountInPaise,
    currency: 'INR',
    orderNumber: order.orderNumber,
    paymentId: payment.id,
  };
}

/**
 * Verify Razorpay payment signature on backend
 */
async function verifyRazorpayPayment({ orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const where = typeof orderId === 'number'
    ? { id: orderId }
    : (!isNaN(Number(orderId)) ? { id: Number(orderId) } : { orderNumber: orderId });

  const order = await prisma.order.findFirst({
    where,
    include: { shop: true },
  });

  if (!order) {
    const err = new Error('Order not found.');
    err.statusCode = 404;
    throw err;
  }

  const { keySecret } = await getShopRazorpayConfig(order.shopId);

  // Validate signature using HMAC SHA256
  const hmac = crypto.createHmac('sha256', keySecret);
  hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
  const expectedSignature = hmac.digest('hex');

  // Allow test signature if in mock mode
  const isMockMatch = keySecret.includes('mock') && razorpaySignature === `mock_sig_${razorpayPaymentId}`;
  const isValid = expectedSignature === razorpaySignature || isMockMatch;

  const payment = await prisma.payment.findFirst({
    where: { razorpayOrderId, orderId },
  });

  if (!isValid) {
    logger.warn(`[Razorpay] Invalid signature attempt for Order #${orderId}`);
    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
    }
    const err = new Error('Payment signature verification failed. Untrusted payment.');
    err.statusCode = 400;
    throw err;
  }

  // Idempotency: prevent double processing
  if (payment && (payment.status === 'SUCCESS' || payment.status === 'COMPLETED')) {
    logger.info(`[Razorpay] Payment for Order #${orderId} was already marked SUCCESS. Skipping duplicate.`);
    return { success: true, payment, alreadyProcessed: true };
  }

  // Update payment status
  const updatedPayment = payment
    ? await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          razorpayPaymentId,
          razorpaySignature,
          paidAt: new Date(),
        },
      })
    : await prisma.payment.create({
        data: {
          orderId,
          amount: order.totalAmount,
          method: 'RAZORPAY',
          status: 'SUCCESS',
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          paidAt: new Date(),
        },
      });

  // Update order status: If order was in PAYMENT_PENDING or PENDING, progress to CONFIRMED / ACCEPTED
  if (['PENDING', 'PAYMENT_PENDING'].includes(order.status)) {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CONFIRMED' },
    });

    await prisma.orderStatusLog.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: 'CONFIRMED',
        note: `Online payment verified via Razorpay (Txn: ${razorpayPaymentId})`,
      },
    });
  }

  // Real-time notification and broadcast
  try {
    await prisma.notification.create({
      data: {
        shopId: order.shopId,
        orderId: order.id,
        type: 'PAYMENT_SUCCESS',
        title: 'Payment Received',
        message: `Order #${order.orderNumber}: Online payment of ₹${order.totalAmount} received successfully.`,
      },
    });

    emitToShop(order.shopId, 'payment:success', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Number(order.totalAmount),
      method: 'RAZORPAY',
      razorpayPaymentId,
      timestamp: new Date(),
    });
  } catch (e) {
    logger.warn(`Failed to broadcast payment notification: ${e.message}`);
  }

  return { success: true, payment: updatedPayment };
}

/**
 * Handle incoming Razorpay Webhook
 */
async function handleRazorpayWebhook(payload, signature, rawBody = null) {
  if (!signature) {
    const err = new Error('Missing webhook signature.');
    err.statusCode = 400;
    throw err;
  }

  const event = payload.event;
  const entity = payload.payload?.payment?.entity;

  if (!entity || !entity.order_id) {
    logger.info(`[Webhook] Ignored unhandled event ${event}`);
    return { success: true, ignored: true };
  }

  const razorpayOrderId = entity.order_id;
  const razorpayPaymentId = entity.id;

  const payment = await prisma.payment.findFirst({
    where: { razorpayOrderId },
    include: { order: true },
  });

  if (!payment) {
    logger.warn(`[Webhook] No matching payment record for Razorpay Order ${razorpayOrderId}`);
    return { success: false, message: 'Payment record not found' };
  }

  // Validate webhook signature if webhook secret is configured
  const { webhookSecret } = await getShopRazorpayConfig(payment.order.shopId);
  if (rawBody && webhookSecret && !webhookSecret.includes('mock')) {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      const err = new Error('Invalid webhook signature.');
      err.statusCode = 400;
      throw err;
    }
  }

  // Idempotency: ignore if already handled
  if (payment.status === 'SUCCESS' && event === 'payment.captured') {
    logger.info(`[Webhook] Idempotent hit: Payment ${razorpayPaymentId} already processed.`);
    return { success: true, idempotent: true };
  }

  if (event === 'payment.captured') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCESS',
        razorpayPaymentId,
        paidAt: new Date(),
        gatewayResponse: payload,
      },
    });

    if (payment.order.status === 'PENDING' || payment.order.status === 'PAYMENT_PENDING') {
      await prisma.order.update({
        where: { id: payment.orderId },
        data: { status: 'CONFIRMED' },
      });
    }

    emitToShop(payment.order.shopId, 'payment:success', {
      orderId: payment.orderId,
      orderNumber: payment.order.orderNumber,
      amount: Number(payment.amount),
      method: 'RAZORPAY',
      razorpayPaymentId,
    });
  } else if (event === 'payment.failed') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        gatewayResponse: payload,
      },
    });
  }

  return { success: true, event };
}

/**
 * Record Counter Payment (For shops with payment disabled or cash/counter collection)
 */
async function recordCounterPayment(shopId, userId, orderId, { amount, notes, method = 'CASH' }) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || membership.status !== 'ACTIVE') {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, shopId },
  });
  if (!order) {
    const err = new Error('Order not found.');
    err.statusCode = 404;
    throw err;
  }

  const collectedAmount = amount !== undefined ? Number(amount) : Number(order.totalAmount);

  const payment = await prisma.payment.create({
    data: {
      orderId,
      amount: collectedAmount,
      method: method === 'UPI' ? 'UPI' : 'CASH',
      status: 'COUNTER_PAYMENT_COLLECTED',
      referenceId: `COUNTER-${Date.now()}`,
      notes: notes || `Counter payment recorded by staff user ${userId}`,
      paidAt: new Date(),
    },
  });

  // Real-time broadcast
  emitToShop(shopId, 'payment:counter_collected', {
    orderId,
    orderNumber: order.orderNumber,
    amount: collectedAmount,
    method,
    staffId: userId,
  });

  return payment;
}

/**
 * Get Shop Payments Feed with Statistics (Payment Dashboard)
 */
async function getShopPayments(shopId, userId, { page = 1, limit = 20, status, method, startDate, endDate } = {}) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || membership.status !== 'ACTIVE') {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  const where = {
    order: { shopId },
  };

  if (status && status !== 'ALL') {
    where.status = status;
  }
  if (method && method !== 'ALL') {
    where.method = method;
  }
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [payments, total, allShopPayments] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            customerNotes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
      skip: offset,
    }),
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where: { order: { shopId } },
      select: { amount: true, status: true, method: true },
    }),
  ]);

  // Aggregate stats
  let totalRevenue = 0;
  let onlineRevenue = 0;
  let counterRevenue = 0;
  let failedCount = 0;

  allShopPayments.forEach((p) => {
    const amt = Number(p.amount);
    if (p.status === 'SUCCESS' || p.status === 'COMPLETED' || p.status === 'COUNTER_PAYMENT_COLLECTED') {
      totalRevenue += amt;
      if (p.status === 'COUNTER_PAYMENT_COLLECTED' || p.method === 'CASH') {
        counterRevenue += amt;
      } else {
        onlineRevenue += amt;
      }
    } else if (p.status === 'FAILED') {
      failedCount++;
    }
  });

  return {
    payments: payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
    })),
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)) || 1,
    },
    stats: {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      onlineRevenue: Number(onlineRevenue.toFixed(2)),
      counterRevenue: Number(counterRevenue.toFixed(2)),
      failedCount,
    },
  };
}

module.exports = {
  getShopRazorpayConfig,
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook,
  recordCounterPayment,
  getShopPayments,
};
