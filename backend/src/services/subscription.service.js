/**
 * Shop Subscription & Billing Service (Super Admin Managed)
 * Single source of truth for:
 * 1. 1-month free trial auto-provisioning
 * 2. Subscription status calculation & days remaining
 * 3. Razorpay monthly subscription order creation & payment verification
 * 4. Super Admin controls (extend trial, grant free days, force-activate, suspend, reactivate, cancel)
 * 5. Platform-wide subscription KPIs and audit logging
 */
'use strict';

const crypto = require('crypto');
const Razorpay = require('razorpay');
const { prisma } = require('../database/client');
const logger = require('../utils/logger');

// Constants
const TRIAL_DURATION_DAYS = 30;
const PAST_DUE_GRACE_DAYS = 3;
const DEFAULT_MONTHLY_AMOUNT = 499.00; // INR per month
const CURRENCY = 'INR';

/**
 * Initialize Razorpay instance for subscription billing
 */
function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    logger.warn('[SubscriptionService] Razorpay API keys not configured in environment.');
  }

  return new Razorpay({
    key_id: keyId || 'rzp_test_placeholder',
    key_secret: keySecret || 'placeholder_secret',
  });
}

/**
 * Single shared calculation for shop subscription status and remaining days
 * Used identically across:
 * - Shop Owner Dashboard persistent banner
 * - Shop Billing page
 * - Super Admin Shop List columns
 * - Super Admin Shop Detail controls
 * - Access control middleware
 */
function computeSubscriptionDetails(subscription) {
  if (!subscription) {
    return {
      status: 'EXPIRED',
      isActive: false,
      daysRemaining: 0,
      effectiveExpiryDate: null,
      reason: 'No subscription record found.',
      isTrial: false,
      bonusDays: 0,
      plan: null,
    };
  }

  const now = new Date();
  const bonusDays = subscription.bonusDays || 0;

  // 1. Manually SUSPENDED by admin: immediately blocked regardless of dates
  if (subscription.status === 'SUSPENDED') {
    return {
      status: 'SUSPENDED',
      isActive: false,
      daysRemaining: 0,
      effectiveExpiryDate: subscription.suspendedAt || now,
      reason: subscription.suspendedReason || 'Shop subscription has been suspended by administration.',
      isTrial: false,
      bonusDays,
      plan: subscription.plan,
    };
  }

  // 2. TRIAL status calculation
  if (subscription.status === 'TRIAL') {
    const baseTrialEnd = new Date(subscription.trialEndsAt);
    const effectiveTrialEnd = new Date(baseTrialEnd.getTime() + bonusDays * 24 * 60 * 60 * 1000);
    const msRemaining = effectiveTrialEnd.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
    const isStillTrial = msRemaining > 0;

    return {
      status: isStillTrial ? 'TRIAL' : 'EXPIRED',
      isActive: isStillTrial,
      daysRemaining,
      effectiveExpiryDate: effectiveTrialEnd,
      reason: isStillTrial ? null : 'Free trial period has expired. Please subscribe to continue.',
      isTrial: true,
      bonusDays,
      plan: null,
    };
  }

  // 3. ACTIVE or CANCELLED status (cancelled keeps access until period end)
  if (subscription.status === 'ACTIVE' || subscription.status === 'CANCELLED') {
    const basePeriodEnd = subscription.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd)
      : (subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : now);
    const effectivePeriodEnd = new Date(basePeriodEnd.getTime() + bonusDays * 24 * 60 * 60 * 1000);
    const msRemaining = effectivePeriodEnd.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
    const isPeriodActive = msRemaining > 0;

    if (isPeriodActive) {
      return {
        status: subscription.status,
        isActive: true,
        daysRemaining,
        effectiveExpiryDate: effectivePeriodEnd,
        reason: subscription.status === 'CANCELLED'
          ? 'Subscription cancelled; active until billing period ends.'
          : null,
        isTrial: false,
        bonusDays,
        plan: subscription.plan || 'MONTHLY',
      };
    }

    // Past period end: check 3-day PAST_DUE grace period
    const graceEnd = new Date(effectivePeriodEnd.getTime() + PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000);
    const inGrace = now < graceEnd;
    if (inGrace && subscription.status !== 'CANCELLED') {
      const graceDaysRemaining = Math.max(0, Math.ceil((graceEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
      return {
        status: 'PAST_DUE',
        isActive: true, // Grace period allows usage
        daysRemaining: graceDaysRemaining,
        effectiveExpiryDate: graceEnd,
        reason: 'Payment is past due. Grace period active.',
        isTrial: false,
        bonusDays,
        plan: subscription.plan || 'MONTHLY',
      };
    }

    return {
      status: 'EXPIRED',
      isActive: false,
      daysRemaining: 0,
      effectiveExpiryDate: effectivePeriodEnd,
      reason: 'Paid subscription has expired. Please renew your plan.',
      isTrial: false,
      bonusDays,
      plan: subscription.plan || 'MONTHLY',
    };
  }

  // 4. PAST_DUE status
  if (subscription.status === 'PAST_DUE') {
    const basePeriodEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : now;
    const effectivePeriodEnd = new Date(basePeriodEnd.getTime() + bonusDays * 24 * 60 * 60 * 1000);
    const graceEnd = new Date(effectivePeriodEnd.getTime() + PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000);
    const inGrace = now < graceEnd;
    const graceDaysRemaining = Math.max(0, Math.ceil((graceEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

    return {
      status: inGrace ? 'PAST_DUE' : 'EXPIRED',
      isActive: inGrace,
      daysRemaining: inGrace ? graceDaysRemaining : 0,
      effectiveExpiryDate: graceEnd,
      reason: inGrace ? 'Payment is past due. Grace period active.' : 'Subscription grace period has expired.',
      isTrial: false,
      bonusDays,
      plan: subscription.plan || 'MONTHLY',
    };
  }

  // 5. Explicit EXPIRED or other
  return {
    status: subscription.status || 'EXPIRED',
    isActive: false,
    daysRemaining: 0,
    effectiveExpiryDate: subscription.currentPeriodEnd || subscription.trialEndsAt || now,
    reason: 'Subscription is inactive. Please subscribe or renew.',
    isTrial: false,
    bonusDays,
    plan: subscription.plan,
  };
}

/**
 * Get or automatically provision a shop subscription record
 */
async function getOrCreateShopSubscription(shopId) {
  const numericShopId = parseInt(shopId, 10);
  if (isNaN(numericShopId)) return null;

  let sub = await prisma.shopSubscription.findUnique({
    where: { shopId: numericShopId },
  });

  if (!sub) {
    const shop = await prisma.shop.findUnique({ where: { id: numericShopId } });
    if (!shop) return null;

    const trialStartedAt = shop.createdAt ? new Date(shop.createdAt) : new Date();
    const trialEndsAt = new Date(trialStartedAt.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();
    const initialStatus = now < trialEndsAt ? 'TRIAL' : 'EXPIRED';

    sub = await prisma.shopSubscription.create({
      data: {
        shopId: numericShopId,
        status: initialStatus,
        plan: null,
        trialStartedAt,
        trialEndsAt,
        bonusDays: 0,
      },
    });

    logger.info(`[SubscriptionService] Auto-provisioned subscription for Shop ID ${numericShopId}: Status ${initialStatus}`);
  }

  return sub;
}

/**
 * Get full subscription overview for shop owner
 */
async function getShopSubscriptionOverview(shopId) {
  const numericShopId = parseInt(shopId, 10);
  const sub = await getOrCreateShopSubscription(numericShopId);

  if (!sub) {
    const err = new Error('Shop subscription not found.');
    err.statusCode = 404;
    throw err;
  }

  const calculation = computeSubscriptionDetails(sub);

  // Fetch subscription payment history
  const paymentHistory = await prisma.subscriptionPayment.findMany({
    where: { shopId: numericShopId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return {
    subscription: {
      id: sub.id,
      shopId: sub.shopId,
      status: calculation.status,
      storedStatus: sub.status,
      plan: sub.plan,
      trialStartedAt: sub.trialStartedAt,
      trialEndsAt: sub.trialEndsAt,
      currentPeriodEnd: sub.currentPeriodEnd,
      bonusDays: sub.bonusDays,
      suspendedAt: sub.suspendedAt,
      suspendedReason: sub.suspendedReason,
      cancelledAt: sub.cancelledAt,
    },
    calculation: {
      isActive: calculation.isActive,
      daysRemaining: calculation.daysRemaining,
      effectiveExpiryDate: calculation.effectiveExpiryDate,
      reason: calculation.reason,
      isTrial: calculation.isTrial,
    },
    pricing: {
      monthlyAmount: DEFAULT_MONTHLY_AMOUNT,
      currency: CURRENCY,
      description: 'SmartPrint Cloud Standard Monthly License',
    },
    payments: paymentHistory,
  };
}

/**
 * Create Razorpay Order for monthly shop subscription
 */
async function createSubscriptionRazorpayOrder(shopId, userId) {
  const numericShopId = parseInt(shopId, 10);
  const shop = await prisma.shop.findUnique({
    where: { id: numericShopId },
    include: { subscription: true },
  });

  if (!shop) {
    const err = new Error('Shop not found.');
    err.statusCode = 404;
    throw err;
  }

  const sub = shop.subscription || await getOrCreateShopSubscription(numericShopId);
  if (sub.status === 'SUSPENDED') {
    const err = new Error('This shop is suspended by administration and cannot be renewed online. Please contact support.');
    err.statusCode = 403;
    throw err;
  }

  const razorpay = getRazorpayInstance();
  const amountInPaise = Math.round(DEFAULT_MONTHLY_AMOUNT * 100);
  const receipt = `sub_sh${numericShopId}_${Date.now().toString(36)}`;

  let rzpOrder;
  try {
    rzpOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: CURRENCY,
      receipt,
      notes: {
        shopId: String(numericShopId),
        shopName: shop.name,
        type: 'SHOP_MONTHLY_SUBSCRIPTION',
        userId: String(userId || ''),
      },
    });
  } catch (rzpErr) {
    logger.error(`[SubscriptionService] Razorpay order creation failed: ${rzpErr.message}`);
    // If test environment with placeholder keys, create deterministic mock order
    if (process.env.NODE_ENV !== 'production' || !process.env.RAZORPAY_KEY_ID) {
      rzpOrder = {
        id: `order_mock_${Date.now()}`,
        amount: amountInPaise,
        currency: CURRENCY,
        receipt,
        status: 'created',
      };
    } else {
      throw rzpErr;
    }
  }

  // Pre-record SubscriptionPayment in CREATED state
  const now = new Date();
  const baseStart = (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > now)
    ? new Date(sub.currentPeriodEnd)
    : now;
  const periodEnd = new Date(baseStart.getTime() + 30 * 24 * 60 * 60 * 1000);

  const paymentRecord = await prisma.subscriptionPayment.create({
    data: {
      shopId: numericShopId,
      razorpayOrderId: rzpOrder.id,
      amount: DEFAULT_MONTHLY_AMOUNT,
      currency: CURRENCY,
      status: 'CREATED',
      periodStart: baseStart,
      periodEnd,
    },
  });

  return {
    orderId: rzpOrder.id,
    amount: DEFAULT_MONTHLY_AMOUNT,
    amountInPaise,
    currency: CURRENCY,
    key: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    shopName: shop.name,
    description: `SmartPrint Monthly Subscription (30 Days)`,
    paymentRecordId: paymentRecord.id,
  };
}

/**
 * Verify Razorpay payment and activate/extend subscription
 */
async function verifySubscriptionPayment({ shopId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const numericShopId = parseInt(shopId, 10);
  const sub = await getOrCreateShopSubscription(numericShopId);

  if (!sub) {
    const err = new Error('Shop subscription record not found.');
    err.statusCode = 404;
    throw err;
  }

  // Verify signature
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  let isSignatureValid = false;

  if (keySecret) {
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    isSignatureValid = (expectedSignature === razorpaySignature);
  } else if (process.env.NODE_ENV !== 'production' || razorpayOrderId.startsWith('order_mock_')) {
    // Development or test sandbox mode
    isSignatureValid = true;
  }

  if (!isSignatureValid) {
    // Record failure if payment record exists
    await prisma.subscriptionPayment.updateMany({
      where: { razorpayOrderId },
      data: { status: 'FAILED' },
    });
    const err = new Error('Invalid Razorpay signature. Payment verification failed.');
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();
  // If renewing early, extend from previous currentPeriodEnd instead of now, so days are not lost
  const baseStart = (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > now)
    ? new Date(sub.currentPeriodEnd)
    : now;
  const newPeriodEnd = new Date(baseStart.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Update payment record and subscription inside transaction
  await prisma.$transaction(async (tx) => {
    await tx.subscriptionPayment.upsert({
      where: { razorpayOrderId },
      update: {
        razorpayPaymentId,
        status: 'PAID',
        periodStart: baseStart,
        periodEnd: newPeriodEnd,
      },
      create: {
        shopId: numericShopId,
        razorpayOrderId,
        razorpayPaymentId,
        amount: DEFAULT_MONTHLY_AMOUNT,
        currency: CURRENCY,
        status: 'PAID',
        periodStart: baseStart,
        periodEnd: newPeriodEnd,
      },
    });

    await tx.shopSubscription.update({
      where: { shopId: numericShopId },
      data: {
        status: 'ACTIVE',
        plan: 'MONTHLY',
        currentPeriodEnd: newPeriodEnd,
        suspendedAt: null,
        suspendedReason: null,
        cancelledAt: null,
      },
    });
  });

  logger.info(`[SubscriptionService] Shop ID ${numericShopId} subscription ACTIVATED via Razorpay until ${newPeriodEnd.toISOString()}`);
  return getShopSubscriptionOverview(numericShopId);
}

/**
 * Cancel shop subscription at end of billing cycle
 */
async function cancelShopSubscription(shopId, userId) {
  const numericShopId = parseInt(shopId, 10);
  const sub = await getOrCreateShopSubscription(numericShopId);

  if (!sub) {
    const err = new Error('Shop subscription not found.');
    err.statusCode = 404;
    throw err;
  }

  if (sub.status !== 'ACTIVE') {
    const err = new Error(`Cannot cancel subscription in ${sub.status} state.`);
    err.statusCode = 400;
    throw err;
  }

  const updated = await prisma.shopSubscription.update({
    where: { shopId: numericShopId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    },
  });

  return getShopSubscriptionOverview(numericShopId);
}

// ============================================================
// SUPER ADMIN MANAGEMENT FUNCTIONS
// ============================================================

/**
 * Extend trial days (+N days to trialEndsAt or bonusDays)
 */
async function adminExtendTrial(adminUserId, shopId, daysToAdd) {
  const numericShopId = parseInt(shopId, 10);
  const days = parseInt(daysToAdd, 10);
  if (isNaN(days) || days <= 0) {
    const err = new Error('Days to add must be a positive integer.');
    err.statusCode = 400;
    throw err;
  }

  const sub = await getOrCreateShopSubscription(numericShopId);
  const currentBonus = sub.bonusDays || 0;
  const newBonus = currentBonus + days;

  // If currently expired trial, extending bonus may restore to TRIAL
  const updated = await prisma.shopSubscription.update({
    where: { shopId: numericShopId },
    data: {
      bonusDays: newBonus,
      status: sub.status === 'EXPIRED' ? 'TRIAL' : sub.status,
    },
  });

  // Write audit log
  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      shopId: numericShopId,
      action: 'SUBSCRIPTION_EXTEND_TRIAL',
      entity: 'ShopSubscription',
      entityId: sub.id,
      details: { addedDays: days, previousBonusDays: currentBonus, newBonusDays: newBonus },
    },
  });

  logger.info(`[AdminSubscription] Admin #${adminUserId} extended trial for Shop #${numericShopId} by ${days} days`);
  return getShopSubscriptionOverview(numericShopId);
}

/**
 * Grant free days to current period (+N days to currentPeriodEnd)
 */
async function adminGrantFreeDays(adminUserId, shopId, daysToGrant, reason) {
  const numericShopId = parseInt(shopId, 10);
  const days = parseInt(daysToGrant, 10);
  if (isNaN(days) || days <= 0) {
    const err = new Error('Days to grant must be a positive integer.');
    err.statusCode = 400;
    throw err;
  }

  const sub = await getOrCreateShopSubscription(numericShopId);
  const now = new Date();
  const currentEnd = sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > now
    ? new Date(sub.currentPeriodEnd)
    : now;
  const newPeriodEnd = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);

  const updated = await prisma.shopSubscription.update({
    where: { shopId: numericShopId },
    data: {
      status: 'ACTIVE',
      currentPeriodEnd: newPeriodEnd,
      plan: sub.plan || 'PROMOTIONAL',
      suspendedAt: null,
      suspendedReason: null,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      shopId: numericShopId,
      action: 'SUBSCRIPTION_GRANT_DAYS',
      entity: 'ShopSubscription',
      entityId: sub.id,
      details: { grantedDays: days, reason: reason || 'Admin promotional grant', newPeriodEnd },
    },
  });

  logger.info(`[AdminSubscription] Admin #${adminUserId} granted ${days} free days to Shop #${numericShopId}`);
  return getShopSubscriptionOverview(numericShopId);
}

/**
 * Force Activate subscription manually (e.g. offline bank payment or enterprise contract)
 */
async function adminForceActivate(adminUserId, shopId, { expiryDate, reason }) {
  const numericShopId = parseInt(shopId, 10);
  if (!expiryDate) {
    const err = new Error('Expiry date is required for force activation.');
    err.statusCode = 400;
    throw err;
  }

  const newPeriodEnd = new Date(expiryDate);
  if (isNaN(newPeriodEnd.getTime()) || newPeriodEnd <= new Date()) {
    const err = new Error('Expiry date must be a valid future date.');
    err.statusCode = 400;
    throw err;
  }

  const sub = await getOrCreateShopSubscription(numericShopId);

  // Create audit payment record for offline / manual billing tracking
  const manualOrderId = `manual_act_${numericShopId}_${Date.now()}`;
  await prisma.subscriptionPayment.create({
    data: {
      shopId: numericShopId,
      razorpayOrderId: manualOrderId,
      razorpayPaymentId: 'MANUAL_ADMIN_ACTIVATION',
      amount: DEFAULT_MONTHLY_AMOUNT,
      currency: CURRENCY,
      status: 'PAID',
      periodStart: new Date(),
      periodEnd: newPeriodEnd,
    },
  });

  await prisma.shopSubscription.update({
    where: { shopId: numericShopId },
    data: {
      status: 'ACTIVE',
      plan: 'MANUAL_ACTIVATED',
      currentPeriodEnd: newPeriodEnd,
      suspendedAt: null,
      suspendedReason: null,
      cancelledAt: null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      shopId: numericShopId,
      action: 'SUBSCRIPTION_FORCE_ACTIVATE',
      entity: 'ShopSubscription',
      entityId: sub.id,
      details: { reason: reason || 'Manual offline activation', newPeriodEnd },
    },
  });

  logger.info(`[AdminSubscription] Admin #${adminUserId} force-activated Shop #${numericShopId} until ${newPeriodEnd.toISOString()}`);
  return getShopSubscriptionOverview(numericShopId);
}

/**
 * Suspend shop subscription immediately
 */
async function adminSuspendShop(adminUserId, shopId, reason) {
  const numericShopId = parseInt(shopId, 10);
  if (!reason || !reason.trim()) {
    const err = new Error('Suspension reason is required.');
    err.statusCode = 400;
    throw err;
  }

  const sub = await getOrCreateShopSubscription(numericShopId);

  await prisma.shopSubscription.update({
    where: { shopId: numericShopId },
    data: {
      status: 'SUSPENDED',
      suspendedAt: new Date(),
      suspendedReason: reason.trim(),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      shopId: numericShopId,
      action: 'SUBSCRIPTION_SUSPEND',
      entity: 'ShopSubscription',
      entityId: sub.id,
      details: { reason: reason.trim() },
    },
  });

  logger.info(`[AdminSubscription] Admin #${adminUserId} SUSPENDED Shop #${numericShopId}: "${reason}"`);
  return getShopSubscriptionOverview(numericShopId);
}

/**
 * Reactivate from Suspended state
 * Recomputes what the status should legitimately be based on dates (trial or active)
 */
async function adminReactivateShop(adminUserId, shopId) {
  const numericShopId = parseInt(shopId, 10);
  const sub = await getOrCreateShopSubscription(numericShopId);

  if (sub.status !== 'SUSPENDED') {
    const err = new Error('Shop is not currently suspended.');
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();
  const bonusDays = sub.bonusDays || 0;

  // Determine legitimate status without suspension
  let restoredStatus = 'EXPIRED';
  if (sub.currentPeriodEnd) {
    const periodEnd = new Date(new Date(sub.currentPeriodEnd).getTime() + bonusDays * 24 * 60 * 60 * 1000);
    if (now < periodEnd) {
      restoredStatus = 'ACTIVE';
    } else {
      const graceEnd = new Date(periodEnd.getTime() + PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000);
      restoredStatus = now < graceEnd ? 'PAST_DUE' : 'EXPIRED';
    }
  } else if (sub.trialEndsAt) {
    const trialEnd = new Date(new Date(sub.trialEndsAt).getTime() + bonusDays * 24 * 60 * 60 * 1000);
    restoredStatus = now < trialEnd ? 'TRIAL' : 'EXPIRED';
  }

  await prisma.shopSubscription.update({
    where: { shopId: numericShopId },
    data: {
      status: restoredStatus,
      suspendedAt: null,
      suspendedReason: null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      shopId: numericShopId,
      action: 'SUBSCRIPTION_REACTIVATE',
      entity: 'ShopSubscription',
      entityId: sub.id,
      details: { restoredStatus },
    },
  });

  logger.info(`[AdminSubscription] Admin #${adminUserId} reactivated Shop #${numericShopId} to ${restoredStatus}`);
  return getShopSubscriptionOverview(numericShopId);
}

/**
 * Cancel shop subscription (Admin action)
 */
async function adminCancelSubscription(adminUserId, shopId, reason) {
  const numericShopId = parseInt(shopId, 10);
  const sub = await getOrCreateShopSubscription(numericShopId);

  await prisma.shopSubscription.update({
    where: { shopId: numericShopId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      shopId: numericShopId,
      action: 'SUBSCRIPTION_CANCEL',
      entity: 'ShopSubscription',
      entityId: sub.id,
      details: { reason: reason || 'Cancelled by admin' },
    },
  });

  logger.info(`[AdminSubscription] Admin #${adminUserId} CANCELLED subscription for Shop #${numericShopId}`);
  return getShopSubscriptionOverview(numericShopId);
}

/**
 * Platform-wide Subscription KPIs for Super Admin Overview
 */
async function getSubscriptionPlatformKPIs() {
  const allShops = await prisma.shop.findMany({
    select: {
      id: true,
      subscription: true,
      createdAt: true,
    },
  });

  let trialCount = 0;
  let activeCount = 0;
  let pastDueCount = 0;
  let expiredCount = 0;
  let suspendedCount = 0;
  let cancelledCount = 0;

  for (const shop of allShops) {
    const sub = shop.subscription || {
      shopId: shop.id,
      status: 'TRIAL',
      trialEndsAt: new Date(new Date(shop.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000),
      bonusDays: 0,
    };

    const calc = computeSubscriptionDetails(sub);
    switch (calc.status) {
      case 'TRIAL':
        trialCount++;
        break;
      case 'ACTIVE':
        activeCount++;
        break;
      case 'PAST_DUE':
        pastDueCount++;
        break;
      case 'SUSPENDED':
        suspendedCount++;
        break;
      case 'CANCELLED':
        cancelledCount++;
        break;
      case 'EXPIRED':
      default:
        expiredCount++;
        break;
    }
  }

  // Estimated Monthly Recurring Revenue (MRR) = ACTIVE shops * plan amount
  const estimatedMRR = activeCount * DEFAULT_MONTHLY_AMOUNT;

  return {
    totalShops: allShops.length,
    trialCount,
    activeCount,
    pastDueCount,
    expiredCount,
    suspendedCount,
    cancelledCount,
    planAmount: DEFAULT_MONTHLY_AMOUNT,
    currency: CURRENCY,
    estimatedMRR,
  };
}

/**
 * Daily Maintenance Job:
 * Evaluates TRIAL expirations and ACTIVE past-due transitions
 */
async function runDailySubscriptionMaintenance() {
  logger.info('[SubscriptionMaintenance] Running daily subscription audit job...');
  const now = new Date();

  const subscriptions = await prisma.shopSubscription.findMany({
    where: {
      status: { in: ['TRIAL', 'ACTIVE', 'PAST_DUE'] },
    },
  });

  let transitioned = 0;

  for (const sub of subscriptions) {
    const calc = computeSubscriptionDetails(sub);

    // If calculated status differs from stored status and it is not a manual status
    if (calc.status !== sub.status && !['SUSPENDED', 'CANCELLED'].includes(sub.status)) {
      await prisma.shopSubscription.update({
        where: { id: sub.id },
        data: { status: calc.status },
      });
      logger.info(`[SubscriptionMaintenance] Transitioned Shop #${sub.shopId} subscription from ${sub.status} to ${calc.status}`);
      transitioned++;
    }
  }

  logger.info(`[SubscriptionMaintenance] Completed. Evaluated ${subscriptions.length} subscriptions, updated ${transitioned}.`);
  return { evaluated: subscriptions.length, updated: transitioned };
}

module.exports = {
  TRIAL_DURATION_DAYS,
  PAST_DUE_GRACE_DAYS,
  DEFAULT_MONTHLY_AMOUNT,
  computeSubscriptionDetails,
  getOrCreateShopSubscription,
  getShopSubscriptionOverview,
  createSubscriptionRazorpayOrder,
  verifySubscriptionPayment,
  cancelShopSubscription,
  adminExtendTrial,
  adminGrantFreeDays,
  adminForceActivate,
  adminSuspendShop,
  adminReactivateShop,
  adminCancelSubscription,
  getSubscriptionPlatformKPIs,
  runDailySubscriptionMaintenance,
};
