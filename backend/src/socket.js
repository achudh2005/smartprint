const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { prisma } = require('./database/client');
const logger = require('./utils/logger');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:5173'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  // Authentication Middleware for WebSocket Connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication error: Missing token'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, name: true, role: true, status: true },
      });

      if (!user || user.status !== 'ACTIVE') {
        return next(new Error('Authentication error: Invalid or deactivated account'));
      }

      socket.user = user;
      next();
    } catch (err) {
      logger.warn(`Socket auth failed: ${err.message}`);
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (User: ${socket.user.email})`);

    // Join shop-specific room after verifying ownership/staff membership
    socket.on('shop:join', async ({ shopId }, callback) => {
      try {
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

module.exports = {
  initSocket,
  getIO,
  getIo: getIO,
  emitToShop,
};
