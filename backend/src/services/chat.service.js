/**
 * Order Chat Service
 * Handles two-way communication between shop owners and customers
 * scoped strictly to the active order/printing window with rate-limited call escalation.
 */
const { prisma } = require('../database/client');
const logger = require('../utils/logger');
const { emitToShop, emitToOrder } = require('../socket');
const { sendOrderPushNotification } = require('./push.service');

// Constants
const CHAT_GRACE_PERIOD_MS = 60 * 60 * 1000; // 1 hour grace period after terminal state
const CALL_REQUEST_COOLDOWN_MS = 30 * 1000; // 30 seconds cooldown between call requests
const TERMINAL_STATUSES = ['COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED'];

/**
 * Check if the chat thread is currently open for new messages
 * Active while order is in active/printing state.
 * Once order is terminal (COMPLETED/REJECTED/CANCELLED/EXPIRED) + 1 hr grace period,
 * thread becomes read-only.
 */
function isChatWindowOpen(order) {
  if (!order) {
    return { isOpen: false, reason: 'ORDER_NOT_FOUND', message: 'Order not found.' };
  }

  // 1. Check order status: terminal states close after the 1-hour grace period
  if (TERMINAL_STATUSES.includes(order.status)) {
    const updatedAt = new Date(order.updatedAt || order.createdAt).getTime();
    const isPastGracePeriod = Date.now() - updatedAt > CHAT_GRACE_PERIOD_MS;
    if (isPastGracePeriod) {
      return {
        isOpen: false,
        reason: 'ORDER_CLOSED',
        message: 'This order is closed and the chat window has expired.',
      };
    }
  }

  // 2. Active orders are ALWAYS open for two-way communication throughout printing
  return { isOpen: true };
}

/**
 * Format message for API / Socket
 * Exposes shop phone ONLY on CALL_REQUEST messages
 */
function formatChatMessage(message, shopPhone) {
  const isCallRequest = message.type === 'CALL_REQUEST';
  return {
    id: message.id,
    orderId: message.orderId,
    senderType: message.senderType,
    senderUserId: message.senderUserId,
    senderName: message.senderUser ? message.senderUser.name : (message.senderType === 'SHOP' ? 'Shop Owner' : 'Customer'),
    body: message.body,
    type: message.type,
    urgent: message.urgent,
    readAt: message.readAt,
    createdAt: message.createdAt,
    shopPhone: isCallRequest ? (shopPhone || null) : undefined,
  };
}

/**
 * Retrieve chat history for an order (paginated, oldest first)
 * Marks messages from the opposite party as read
 */
async function getOrderChat({ orderId, orderNumber, isShop, userId, limit = 50, page = 1 }) {
  // Find order
  const orderWhere = {};
  if (orderId) {
    orderWhere.id = parseInt(orderId, 10);
  } else if (orderNumber) {
    const cleanNum = String(orderNumber).trim();
    orderWhere.OR = [
      { orderNumber: cleanNum.toUpperCase() },
      { orderNumber: cleanNum },
      { publicId: cleanNum },
    ];
  }

  const order = await prisma.order.findFirst({
    where: orderWhere,
    include: {
      shop: {
        select: { id: true, name: true, phone: true },
      },
      session: {
        select: { id: true, status: true, expiresAt: true },
      },
    },
  });

  if (!order) {
    const err = new Error('Order not found.');
    err.statusCode = 404;
    throw err;
  }

  const windowStatus = isChatWindowOpen(order);

  // Mark unread messages from the other party as read
  const oppositeSender = isShop ? 'CUSTOMER' : 'SHOP';
  await prisma.orderChatMessage.updateMany({
    where: {
      orderId: order.id,
      senderType: oppositeSender,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  const take = Math.min(Math.max(1, parseInt(limit, 10) || 50), 100);
  const skip = (Math.max(1, parseInt(page, 10) || 1) - 1) * take;

  const [messages, totalCount] = await Promise.all([
    prisma.orderChatMessage.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'asc' }, // Oldest first
      skip,
      take,
      include: {
        senderUser: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.orderChatMessage.count({ where: { orderId: order.id } }),
  ]);

  const formatted = messages.map((m) => formatChatMessage(m, order.shop?.phone));

  // Compute remaining cooldown for CALL_REQUEST
  const latestCallRequest = messages
    .slice()
    .reverse()
    .find((m) => m.type === 'CALL_REQUEST');
  let callCooldownRemaining = 0;
  if (latestCallRequest) {
    const elapsed = Date.now() - new Date(latestCallRequest.createdAt).getTime();
    if (elapsed < CALL_REQUEST_COOLDOWN_MS) {
      callCooldownRemaining = Math.ceil((CALL_REQUEST_COOLDOWN_MS - elapsed) / 1000);
    }
  }

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    isChatOpen: windowStatus.isOpen,
    chatCloseReason: windowStatus.reason || null,
    chatCloseMessage: windowStatus.message || null,
    callCooldownRemaining,
    messages: formatted,
    totalCount,
    page: parseInt(page, 10) || 1,
    limit: take,
  };
}

/**
 * Post a new message to the order chat
 * Enforces availability window, rate limiting for CALL_REQUEST, and push delivery
 */
async function postOrderMessage({ orderId, orderNumber, senderType, senderUserId = null, body, type = 'TEXT', urgent = false }) {
  const orderWhere = {};
  if (orderId) {
    orderWhere.id = parseInt(orderId, 10);
  } else if (orderNumber) {
    const cleanNum = String(orderNumber).trim();
    orderWhere.OR = [
      { orderNumber: cleanNum.toUpperCase() },
      { orderNumber: cleanNum },
      { publicId: cleanNum },
    ];
  }

  const order = await prisma.order.findFirst({
    where: orderWhere,
    include: {
      shop: {
        select: { id: true, name: true, phone: true },
      },
      session: {
        select: { id: true, status: true, expiresAt: true },
      },
    },
  });

  if (!order) {
    const err = new Error('Order not found.');
    err.statusCode = 404;
    throw err;
  }

  // 1. Enforce availability window server-side
  const windowStatus = isChatWindowOpen(order);
  if (!windowStatus.isOpen) {
    const err = new Error(windowStatus.message || 'Chat window is closed for this order.');
    err.statusCode = 403;
    err.code = windowStatus.reason;
    throw err;
  }

  const messageType = type === 'CALL_REQUEST' ? 'CALL_REQUEST' : 'TEXT';
  let isUrgent = urgent || messageType === 'CALL_REQUEST';

  // 2. Part 2: "Request a Call" validations & rate limiting
  if (messageType === 'CALL_REQUEST') {
    if (senderType !== 'SHOP') {
      const err = new Error('Only the shop owner can issue a call request.');
      err.statusCode = 403;
      throw err;
    }

    // Rate-limit: 1 call request per order per 2 minutes
    const latestCallRequest = await prisma.orderChatMessage.findFirst({
      where: {
        orderId: order.id,
        type: 'CALL_REQUEST',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (latestCallRequest) {
      const elapsedMs = Date.now() - new Date(latestCallRequest.createdAt).getTime();
      if (elapsedMs < CALL_REQUEST_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((CALL_REQUEST_COOLDOWN_MS - elapsedMs) / 1000);
        const err = new Error(`A call request was recently sent. Please wait ${remainingSeconds}s before requesting another call.`);
        err.statusCode = 429;
        throw err;
      }
    }
  }

  // 3. Persist message in DB
  const createdMessage = await prisma.orderChatMessage.create({
    data: {
      orderId: order.id,
      senderType,
      senderUserId: senderType === 'SHOP' ? senderUserId : null,
      body: String(body || '').trim() || (messageType === 'CALL_REQUEST' ? 'The shop requested a phone call.' : ''),
      type: messageType,
      urgent: isUrgent,
    },
    include: {
      senderUser: {
        select: { id: true, name: true },
      },
    },
  });

  // 4. Format payload (includes shopPhone ONLY if CALL_REQUEST)
  const formatted = formatChatMessage(createdMessage, order.shop?.phone);

  // 5. Emit real-time socket events
  try {
    // To Shop Dashboard room
    emitToShop(order.shopId, 'chat:new-message', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      message: formatted,
    });

    // To Customer Order room
    emitToOrder(order.id, order.orderNumber, 'chat:new-message', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      message: formatted,
    });
  } catch (sockErr) {
    logger.warn(`Failed to broadcast socket event for chat message: ${sockErr.message}`);
  }

  // 6. Web Push Notification to Customer (if shop sent message)
  if (senderType === 'SHOP') {
    try {
      sendOrderPushNotification(order, {
        title: order.shop.name || 'SmartPrint Shop',
        body: messageType === 'CALL_REQUEST'
          ? (formatted.body ? `Call Request: ${formatted.body}` : 'The shop wants to call you about your order.')
          : formatted.body,
        type: messageType,
        url: `/orders/${order.orderNumber}`,
      }).catch((pushErr) => {
        logger.warn(`Background push dispatch error: ${pushErr.message}`);
      });
    } catch (err) {
      logger.warn(`Web push trigger error: ${err.message}`);
    }
  }

  return formatted;
}

/**
 * Get map of unread customer messages count per order for a given shop
 */
async function getShopUnreadCounts(shopId) {
  const parsedShopId = parseInt(shopId, 10);
  if (isNaN(parsedShopId)) return {};

  const unreadCounts = await prisma.orderChatMessage.groupBy({
    by: ['orderId'],
    where: {
      senderType: 'CUSTOMER',
      readAt: null,
      order: {
        shopId: parsedShopId,
      },
    },
    _count: {
      id: true,
    },
  });

  const countMap = {};
  for (const item of unreadCounts) {
    countMap[item.orderId] = item._count.id;
  }
  return countMap;
}

module.exports = {
  isChatWindowOpen,
  getOrderChat,
  postOrderMessage,
  getShopUnreadCounts,
  CHAT_GRACE_PERIOD_MS,
  CALL_REQUEST_COOLDOWN_MS,
};
