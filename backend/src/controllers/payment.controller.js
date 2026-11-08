/**
 * Payment Controller
 * Exposes endpoints for Razorpay order generation, signature verification,
 * webhooks, counter payments, and shop-scoped payment audits.
 */
const paymentService = require('../services/payment.service');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * POST /api/v1/payments/razorpay/order
 * Body: { orderId }
 */
async function createRazorpayOrder(req, res, next) {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return sendError(res, 'Order ID is required.', 400);
    }

    const data = await paymentService.createRazorpayOrder(parseInt(orderId, 10));
    return sendSuccess(res, data, 'Razorpay order created successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/payments/razorpay/verify
 * Body: { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature }
 */
async function verifyRazorpayPayment(req, res, next) {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return sendError(res, 'Missing required payment verification parameters.', 400);
    }

    const data = await paymentService.verifyRazorpayPayment({
      orderId: parseInt(orderId, 10),
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    return sendSuccess(res, data, 'Payment verified successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/payments/razorpay/webhook
 */
async function handleRazorpayWebhook(req, res, next) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    const result = await paymentService.handleRazorpayWebhook(req.body, signature, rawBody);
    return res.status(200).json({ status: 'ok', result });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/shops/:shopId/orders/:orderId/counter-payment
 */
async function recordCounterPayment(req, res, next) {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const orderId = parseInt(req.params.orderId, 10);
    const { amount, notes, method } = req.body;

    const payment = await paymentService.recordCounterPayment(shopId, req.user.id, orderId, {
      amount,
      notes,
      method,
    });

    return sendSuccess(res, { payment }, 'Counter payment recorded successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/shops/:shopId/payments
 */
async function getShopPayments(req, res, next) {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const { page, limit, status, method, startDate, endDate } = req.query;

    const data = await paymentService.getShopPayments(shopId, req.user.id, {
      page,
      limit,
      status,
      method,
      startDate,
      endDate,
    });

    return sendSuccess(res, data, 'Shop payments loaded.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook,
  recordCounterPayment,
  getShopPayments,
};
