// ============================================================
// Authentication Middleware
// ============================================================
const jwt = require('jsonwebtoken');
const { prisma } = require('../database/client');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Verifies the JWT access token.
 * Attaches req.user = { id, publicId, email, role, status }
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && (req.query.token || req.query.accessToken)) {
      token = req.query.token || req.query.accessToken;
    }

    if (!token) {
      return sendError(res, 'Authentication required. Please log in.', 401);
    }

    const jwtSecret = process.env.JWT_SECRET || 'smartprint_jwt_fallback_secret_production_guard_9281749102';
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Session expired. Please log in again.', 401);
      }
      return sendError(res, 'Invalid authentication token.', 401);
    }

    const userId = Number(decoded.sub || decoded.id);

    // Fetch fresh user data (catches deactivated accounts)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: !isNaN(userId) ? userId : -1 },
          { email: decoded.email || '' },
        ],
      },
      select: {
        id: true,
        publicId: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return sendError(res, 'User account not found.', 401);
    }

    if (user.status !== 'ACTIVE') {
      return sendError(res, 'Your account has been deactivated. Please contact support.', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return sendError(res, 'Authentication failed.', 500);
  }
};

/**
 * Verifies the user has the required role(s).
 * Usage: authorize('OWNER', 'MANAGER')
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401);
    }
    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 'You do not have permission to perform this action.', 403);
    }
    next();
  };
};

/**
 * Verifies the user is a member of the requested shop.
 * Reads shopId from req.params.shopId or req.body.shopId.
 * Attaches req.shopMembership = { shopId, role }
 */
const requireShopMembership = async (req, res, next) => {
  try {
    // shopId can come from params (preferred) or body (never trust frontend alone)
    const rawShopId = req.params.shopId || req.body.shopId;
    if (!rawShopId) {
      return sendError(res, 'Shop identifier is required.', 400);
    }

    const shopId = parseInt(rawShopId, 10);
    if (isNaN(shopId)) {
      return sendError(res, 'Invalid shop identifier.', 400);
    }

    // Verify shop exists
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, status: true },
    });

    if (!shop) {
      return sendError(res, 'Shop not found.', 404);
    }

    if (shop.status !== 'ACTIVE') {
      return sendError(res, 'This shop is not currently active.', 403);
    }

    // Platform Super Admin has access to all shops
    if (req.user.role === 'SUPER_ADMIN') {
      req.shopId = shopId;
      req.shopMembership = { shopId, role: 'OWNER' };
      return next();
    }

    // Verify user is a member of this shop
    const membership = await prisma.shopUser.findUnique({
      where: {
        shopId_userId: { shopId, userId: req.user.id },
      },
      select: { role: true, status: true },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      return sendError(res, 'You do not have access to this shop.', 403);
    }

    req.shopId = shopId;
    req.shopMembership = { shopId, role: membership.role };
    next();
  } catch (error) {
    logger.error('Shop membership middleware error:', error);
    return sendError(res, 'Authorization failed.', 500);
  }
};

/**
 * Requires the user to be a shop OWNER or MANAGER.
 * Must be used after requireShopMembership.
 */
const requireShopOwnerOrManager = (req, res, next) => {
  if (!req.shopMembership) {
    return sendError(res, 'Shop authorization required.', 403);
  }
  const { role } = req.shopMembership;
  if (role !== 'OWNER' && role !== 'MANAGER') {
    return sendError(res, 'Only shop owners and managers can perform this action.', 403);
  }
  next();
};

/**
 * Requires the user to be the shop OWNER.
 * Must be used after requireShopMembership.
 */
const requireShopOwner = (req, res, next) => {
  if (!req.shopMembership || req.shopMembership.role !== 'OWNER') {
    return sendError(res, 'Only shop owners can perform this action.', 403);
  }
  next();
};

module.exports = {
  authenticate,
  authorize,
  requireShopMembership,
  requireShopOwnerOrManager,
  requireShopOwner,
};
