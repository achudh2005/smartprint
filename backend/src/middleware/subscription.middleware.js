/**
 * Shop Subscription Access Control Middleware
 * Blocks access to operational shop management features if the shop's
 * trial or paid subscription has lapsed or is suspended.
 */
'use strict';

const { getOrCreateShopSubscription, computeSubscriptionDetails } = require('../services/subscription.service');
const { sendError } = require('../utils/response');

async function requireActiveSubscription(req, res, next) {
  try {
    // 1. Super Admin always has unfettered operational access
    if (req.user && req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // 2. Allow subscription/billing routes so shop owners can inspect status, create orders, and pay
    if (req.originalUrl && req.originalUrl.includes('/subscription')) {
      return next();
    }

    // 3. Allow basic read-only shop profile so layout & top-bar can render shop name and logo
    if (req.method === 'GET' && (req.path === `/${req.params.shopId}` || req.path === '/')) {
      return next();
    }

    const rawShopId = req.shopId || req.params.shopId || req.body.shopId;
    if (!rawShopId) {
      // If no shopId in route context, pass through to let router/validator handle
      return next();
    }

    const shopId = parseInt(rawShopId, 10);
    if (isNaN(shopId)) {
      return sendError(res, 'Invalid shop identifier.', 400);
    }

    const subscription = await getOrCreateShopSubscription(shopId);
    if (!subscription) {
      return sendError(res, 'Shop subscription record not found.', 404);
    }

    const calculation = computeSubscriptionDetails(subscription);

    // If subscription is active (in active trial, active paid period, or grace period), allow
    if (calculation.isActive) {
      req.shopSubscription = calculation;
      return next();
    }

    // Otherwise, block with HTTP 402 (Payment Required) so frontend can show Subscription Screen
    return res.status(402).json({
      success: false,
      code: 'SUBSCRIPTION_REQUIRED',
      message: calculation.reason || 'An active subscription is required to access shop features.',
      data: {
        shopId,
        status: calculation.status,
        daysRemaining: calculation.daysRemaining,
        effectiveExpiryDate: calculation.effectiveExpiryDate,
        isTrial: calculation.isTrial,
        bonusDays: calculation.bonusDays,
        requiresPayment: true,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requireActiveSubscription,
};
