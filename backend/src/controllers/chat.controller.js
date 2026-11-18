/**
 * Chat Controller
 * Endpoints for Shop Owners and Customers to exchange messages and register Web Push
 */
const chatService = require('../services/chat.service');
const pushService = require('../services/push.service');
const { prisma } = require('../database/client');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * GET /api/v1/shops/:shopId/orders/:orderId/chat
 * Shop owner retrieves paginated chat history for an order
 */
async function getShopOrderChat(req, res, next) {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const orderId = parseInt(req.params.orderId, 10);

    const result = await chatService.getOrderChat({
      orderId,
      isShop: true,
      userId: req.user.id,
      limit: req.query.limit,
      page: req.query.page,
    });

    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/shops/:shopId/orders/:orderId/chat
 * Shop owner sends a message or requests a call
 */
async function postShopOrderMessage(req, res, next) {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const orderId = parseInt(req.params.orderId, 10);
    const { body, type = 'TEXT', urgent = false } = req.body;

    if (type !== 'CALL_REQUEST' && (!body || !String(body).trim())) {
      return sendError(res, 'Message body cannot be empty.', 400);
    }

    const message = await chatService.postOrderMessage({
      orderId,
      senderType: 'SHOP',
      senderUserId: req.user.id,
      body,
      type,
      urgent,
    });

    return sendSuccess(res, message, 'Message sent successfully.', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/shops/:shopId/orders-unread-chat
 * Returns map of unread customer message counts per order for shop badge
 */
async function getShopUnreadCounts(req, res, next) {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const unreadMap = await chatService.getShopUnreadCounts(shopId);
    return sendSuccess(res, unreadMap);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/customer/orders/:orderPublicId/chat
 * Customer retrieves chat history for their order
 */
async function getCustomerOrderChat(req, res, next) {
  try {
    const orderIdentifier = req.params.orderPublicId || req.params.orderNumber;
    const result = await chatService.getOrderChat({
      orderNumber: orderIdentifier,
      isShop: false,
      limit: req.query.limit,
      page: req.query.page,
    });

    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/customer/orders/:orderPublicId/chat
 * Customer sends a message to the shop
 */
async function postCustomerOrderMessage(req, res, next) {
  try {
    const orderIdentifier = req.params.orderPublicId || req.params.orderNumber;
    const { body } = req.body;

    if (!body || !String(body).trim()) {
      return sendError(res, 'Message body cannot be empty.', 400);
    }

    const message = await chatService.postOrderMessage({
      orderNumber: orderIdentifier,
      senderType: 'CUSTOMER',
      body,
      type: 'TEXT',
      urgent: false,
    });

    return sendSuccess(res, message, 'Message sent successfully.', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/customer/orders/:orderPublicId/push-subscribe
 * Customer registers browser Web Push subscription for OS notification bar.
 * Subscription is now linked to orderId (primary) so it survives session expiry.
 */
async function subscribePush(req, res, next) {
  try {
    const orderIdentifier = req.params.orderPublicId || req.params.orderNumber;
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys) {
      return sendError(res, 'Valid push subscription object required (endpoint, keys).', 400);
    }

    const cleanNum = String(orderIdentifier).trim();
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { orderNumber: cleanNum.toUpperCase() },
          { orderNumber: cleanNum },
          { publicId: cleanNum },
        ],
      },
      select: { id: true, sessionId: true },
    });

    if (!order) {
      return sendError(res, 'Order not found for notification subscription.', 404);
    }

    // Save subscription linked to both orderId and sessionId for maximum reliability
    const subscription = await pushService.saveSubscription(
      order.sessionId,     // may be null if session was cleared — OK
      { endpoint, keys },
      order.id             // primary key — survives session expiry
    );
    return sendSuccess(res, { id: subscription.id, createdAt: subscription.createdAt }, 'Notifications enabled successfully.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getShopOrderChat,
  postShopOrderMessage,
  getShopUnreadCounts,
  getCustomerOrderChat,
  postCustomerOrderMessage,
  subscribePush,
};
