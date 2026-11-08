/**
 * Super Admin Service
 * Platform-wide administration, tenant lifecycle (approve, suspend, activate),
 * user management, platform analytics, and security audit log review.
 */
const { prisma } = require('../database/client');
const logger = require('../utils/logger');

/**
 * Gatekeeper middleware / assertion for Super Admin privileges
 */
async function assertSuperAdmin(userOrId) {
  if (!userOrId) {
    const err = new Error('Access denied. Super Admin privileges required.');
    err.statusCode = 403;
    throw err;
  }
  let user = userOrId;
  if (typeof userOrId === 'number' || typeof userOrId === 'string') {
    user = await prisma.user.findUnique({ where: { id: parseInt(userOrId, 10) } });
  }
  if (!user || user.role !== 'SUPER_ADMIN') {
    const err = new Error('Access denied. Super Admin privileges required.');
    err.statusCode = 403;
    throw err;
  }
  return user;
}

/**
 * Platform Overview Statistics
 */
async function getPlatformOverview(adminUser) {
  const admin = await assertSuperAdmin(adminUser);

  const [
    totalShops,
    activeShops,
    suspendedShops,
    totalUsers,
    totalOrders,
    totalRevenueData,
    allFiles,
    recentShops,
    recentAudits,
  ] = await Promise.all([
    prisma.shop.count(),
    prisma.shop.count({ where: { status: 'ACTIVE' } }),
    prisma.shop.count({ where: { status: 'SUSPENDED' } }),
    prisma.user.count(),
    prisma.order.count(),
    prisma.payment.findMany({
      where: {
        status: { in: ['SUCCESS', 'COMPLETED', 'COUNTER_PAYMENT_COLLECTED'] },
      },
      select: { amount: true },
    }),
    prisma.orderFile.findMany({
      select: { fileSizeBytes: true, isPurged: true },
    }),
    prisma.shop.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { orders: true, shopUsers: true } },
      },
    }),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        shop: { select: { id: true, name: true, shopCode: true } },
      },
    }),
  ]);

  let totalPlatformRevenue = 0;
  totalRevenueData.forEach((p) => {
    totalPlatformRevenue += Number(p.amount);
  });

  let totalActiveBytes = BigInt(0);
  let totalPurgedBytes = BigInt(0);
  allFiles.forEach((f) => {
    if (f.isPurged) totalPurgedBytes += BigInt(f.fileSizeBytes || 0);
    else totalActiveBytes += BigInt(f.fileSizeBytes || 0);
  });

  return {
    kpis: {
      totalShops,
      activeShops,
      suspendedShops,
      totalUsers,
      totalOrders,
      totalPlatformRevenue: Number(totalPlatformRevenue.toFixed(2)),
      storage: {
        activeBytes: totalActiveBytes.toString(),
        purgedBytes: totalPurgedBytes.toString(),
      },
    },
    recentShops,
    recentAudits,
  };
}

/**
 * List all shops on platform with pagination & filters
 */
async function listAllShops(adminUser, { page = 1, limit = 20, status, search } = {}) {
  const admin = await assertSuperAdmin(adminUser);

  const where = {};
  if (status && status !== 'ALL') {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { shopCode: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [shops, total] = await Promise.all([
    prisma.shop.findMany({
      where,
      include: {
        _count: { select: { orders: true, printers: true, shopUsers: true } },
        shopSettings: true,
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
      skip: offset,
    }),
    prisma.shop.count({ where }),
  ]);

  return {
    shops,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)) || 1,
    },
  };
}

/**
 * Update shop lifecycle status (Approve, Suspend, Activate)
 */
async function updateShopStatus(adminUser, shopId, { status, reason, subscriptionTier }) {
  const admin = await assertSuperAdmin(adminUser);

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
  });
  if (!shop) {
    const err = new Error('Shop not found.');
    err.statusCode = 404;
    throw err;
  }

  const updateData = {};
  if (status) updateData.status = status;
  if (subscriptionTier) updateData.subscriptionTier = subscriptionTier;

  const updatedShop = await prisma.shop.update({
    where: { id: shopId },
    data: updateData,
  });

  // Log in platform AuditLog
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      shopId,
      action: `SHOP_${status || 'UPDATED'}`,
      details: {
        fromStatus: shop.status,
        toStatus: status || shop.status,
        reason: reason || 'Administrative status change by Super Admin',
        subscriptionTier: subscriptionTier || shop.subscriptionTier,
      },
    },
  });

  logger.info(`[SuperAdmin] Shop #${shopId} (${shop.name}) status changed to ${status} by admin #${admin.id}`);
  return updatedShop;
}

/**
 * List all users across the platform
 */
async function listAllUsers(adminUser, { page = 1, limit = 20, role, status, search } = {}) {
  const admin = await assertSuperAdmin(adminUser);

  const where = {};
  if (role && role !== 'ALL') where.role = role;
  if (status && status !== 'ALL') where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        publicId: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        shopUsers: {
          include: {
            shop: { select: { id: true, name: true, shopCode: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
      skip: offset,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)) || 1,
    },
  };
}

/**
 * Update user role or status (Suspend, Activate, Role change)
 */
async function updateUser(adminUser, targetUserId, { role, status, reason }) {
  const admin = await assertSuperAdmin(adminUser);

  if (targetUserId === admin.id && status === 'SUSPENDED') {
    const err = new Error('Cannot suspend your own Super Admin account.');
    err.statusCode = 400;
    throw err;
  }

  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      ...(role && { role }),
      ...(status && { status }),
    },
    select: {
      id: true,
      publicId: true,
      name: true,
      email: true,
      role: true,
      status: true,
      updatedAt: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'USER_UPDATED',
      details: {
        targetUserId,
        previousRole: user.role,
        newRole: role || user.role,
        previousStatus: user.status,
        newStatus: status || user.status,
        reason: reason || 'Administrative update by Super Admin',
      },
    },
  });

  return updatedUser;
}

/**
 * View platform audit logs
 */
async function getAuditLogs(adminUser, { page = 1, limit = 50, action, shopId } = {}) {
  const admin = await assertSuperAdmin(adminUser);

  const where = {};
  if (action && action !== 'ALL') where.action = action;
  if (shopId) where.shopId = parseInt(shopId, 10);

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        shop: { select: { id: true, name: true, shopCode: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)) || 1,
    },
  };
}

module.exports = {
  assertSuperAdmin,
  getPlatformOverview,
  listAllShops,
  updateShopStatus,
  listAllUsers,
  updateUser,
  getAuditLogs,
};
