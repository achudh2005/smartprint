const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { prisma } = require('./database/client');
const logger = require('./utils/logger');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (process.env.ALLOWED_ORIGINS) {
          const allowed = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
          if (allowed.includes(origin)) return callback(null, true);
        }
        return callback(null, true);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  // Authentication Middleware for WebSocket Connections
  // Supports both Shop Owners (JWT) and Customers (sessionToken / orderNumber)
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      const sessionToken = socket.handshake.auth?.sessionToken || socket.handshake.query?.sessionToken;
      const orderNumber = socket.handshake.auth?.orderNumber || socket.handshake.query?.orderNumber;

      // 1. Shop Owner / Staff Authentication via JWT
      if (token) {
        try {
          const jwtSecret = process.env.JWT_SECRET || 'smartprint_jwt_fallback_secret_production_guard_9281749102';
          const decoded = jwt.verify(token, jwtSecret);
          const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, name: true, role: true, status: true },
          });

          if (user && user.status === 'ACTIVE') {
            socket.user = user;
            socket.authType = 'SHOP_USER';
            return next();
          }
        } catch (jwtErr) {
          // If JWT failed but sessionToken/orderNumber exists, try customer fallback below
          if (!sessionToken && !orderNumber) {
            logger.warn(`Socket JWT auth failed: ${jwtErr.message}`);
            return next(new Error('Authentication error: Invalid token'));
          }
        }
      }

      // 2. Customer Authentication via sessionToken or orderNumber
      if (sessionToken || orderNumber) {
        socket.customer = {
          sessionToken: sessionToken ? String(sessionToken).trim() : null,
          orderNumber: orderNumber ? String(orderNumber).trim().toUpperCase() : null,
        };
        socket.authType = 'CUSTOMER';
        return next();
      }

      return next(new Error('Authentication error: Missing authentication token or customer session'));
    } catch (err) {
      logger.warn(`Socket auth error: ${err.message}`);
      return next(new Error('Authentication error: ' + err.message));
    }
  });

  io.on('connection', (socket) => {
    const ident = socket.user ? `User: ${socket.user.email}` : `Customer (Order/Session)`;
    logger.info(`Socket connected: ${socket.id} (${ident})`);

    // Join shop-specific room after verifying ownership/staff membership
    socket.on('shop:join', async ({ shopId }, callback) => {
      try {
        if (!socket.user) {
          if (callback) callback({ success: false, message: 'Shop authentication required' });
          return;
        }

        const parsedShopId = parseInt(shopId, 10);
        if (isNaN(parsedShopId)) {
          if (callback) callback({ success: false, message: 'Invalid shopId' });
          return;
        }

        const membership = await prisma.shopUser.findUnique({
          where: {
            shopId_userId: {
              shopId: parsedShopId,
              userId: socket.user.id,
            },
          },
        });

        if (!membership || membership.status !== 'ACTIVE') {
          logger.warn(`Unauthorized shop:join attempt by user ${socket.user.id} for shop ${parsedShopId}`);
          if (callback) callback({ success: false, message: 'Unauthorized for this shop' });
          return;
        }

        const room = `shop_${parsedShopId}`;
        socket.join(room);
        logger.info(`User ${socket.user.email} joined room ${room}`);

        if (callback) callback({ success: true, room });
      } catch (err) {
        logger.error(`Error in shop:join: ${err.message}`);
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('shop:leave', ({ shopId }) => {
      const parsedShopId = parseInt(shopId, 10);
      if (!isNaN(parsedShopId)) {
        socket.leave(`shop_${parsedShopId}`);
      }
    });

    // Customer / Order Room Join (for real-time order chat & status updates)
    socket.on('order:join', async ({ orderId, orderNumber }, callback) => {
      try {
        const cleanOrderNumber = orderNumber ? String(orderNumber).trim().toUpperCase() : null;
        const parsedOrderId = orderId ? parseInt(orderId, 10) : null;

        if (parsedOrderId && !isNaN(parsedOrderId)) {
          socket.join(`order_${parsedOrderId}`);
        }
        if (cleanOrderNumber) {
          socket.join(`order_num_${cleanOrderNumber}`);
        }

        logger.info(`Socket ${socket.id} joined order room (id: ${parsedOrderId}, num: ${cleanOrderNumber})`);
        if (callback) callback({ success: true });
      } catch (err) {
        logger.error(`Error in order:join: ${err.message}`);
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('order:leave', ({ orderId, orderNumber }) => {
      if (orderId) socket.leave(`order_${orderId}`);
      if (orderNumber) socket.leave(`order_num_${String(orderNumber).trim().toUpperCase()}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet.');
  }
  return io;
}

/**
 * Emit event to all authorized connected users in a shop room
 */
function emitToShop(shopId, event, data) {
  if (!io) return;
  const room = `shop_${shopId}`;
  io.to(room).emit(event, data);
  logger.debug(`Broadcasted [${event}] to room ${room}`);
}

/**
 * Emit event to customer(s) watching a specific order
 */
function emitToOrder(orderId, orderNumber, event, data) {
  if (!io) return;
  if (orderId) {
    io.to(`order_${orderId}`).emit(event, data);
  }
  if (orderNumber) {
    io.to(`order_num_${String(orderNumber).trim().toUpperCase()}`).emit(event, data);
  }
  logger.debug(`Broadcasted [${event}] to order rooms (id: ${orderId}, num: ${orderNumber})`);
}

module.exports = {
  initSocket,
  getIO,
  getIo: getIO,
  emitToShop,
  emitToOrder,
};
