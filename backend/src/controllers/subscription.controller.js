/**
 * Shop Subscription & Billing Controller
 */
'use strict';

const subscriptionService = require('../services/subscription.service');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * GET /api/v1/shops/:shopId/subscription
 * Get subscription status, days remaining, pricing, and payment history
 */
const getSubscription = async (req, res, next) => {
  try {
    const data = await subscriptionService.getShopSubscriptionOverview(req.params.shopId);
    return sendSuccess(res, data, 'Subscription details retrieved successfully.');
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/v1/shops/:shopId/subscription/create-order
 * Create Razorpay order to pay for monthly subscription
 */
const createSubscriptionOrder = async (req, res, next) => {
  try {
    const orderData = await subscriptionService.createSubscriptionRazorpayOrder(
      req.params.shopId,
      req.user.id
    );
    return sendSuccess(res, orderData, 'Razorpay subscription order created successfully.');
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/v1/shops/:shopId/subscription/verify-payment
 * Verify signature and activate or renew monthly subscription
 */
const verifySubscriptionPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    if (!razorpayOrderId || !razorpayPaymentId) {
      return sendError(res, 'Razorpay order ID and payment ID are required.', 400);
    }

    const result = await subscriptionService.verifySubscriptionPayment({
      shopId: req.params.shopId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    return sendSuccess(res, result, 'Subscription payment verified and activated successfully.');
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/v1/shops/:shopId/subscription/cancel
 * Cancel subscription at period end
 */
const cancelSubscription = async (req, res, next) => {
  try {
    const result = await subscriptionService.cancelShopSubscription(req.params.shopId, req.user.id);
    return sendSuccess(res, result, 'Subscription cancelled successfully. Access remains active until billing period ends.');
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getSubscription,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  cancelSubscription,
};
