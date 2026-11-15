/**
 * Super Admin Service
 * Platform-wide administration, tenant lifecycle (approve, suspend, activate),
 * user management, platform analytics, session revocation, and security audit log review.
 */
const crypto = require('crypto');
const argon2 = require('argon2');
const { prisma } = require('../database/client');
const logger = require('../utils/logger');
const shopService = require('./shop.service');
const emailService = require('./email.service');

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: parseInt(process.env.ARGON2_MEMORY_COST) || 65536,
  timeCost: parseInt(process.env.ARGON2_TIME_COST) || 3,
  parallelism: parseInt(process.env.ARGON2_PARALLELISM) || 4,
};

/**
 * Generate a cryptographically strong, human-readable temporary password.
 * Avoids ambiguous characters like 0, O, o, 1, l, I.
 */
function generateTemporaryPassword(length = 12) {
  const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz!@#$%*';
  const bytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[bytes[i] % charset.length];
  }
  return password;
}

/**
 * Gatekeeper assertion for Super Admin privileges
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
  await assertSuperAdmin(adminUser);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [
    totalShops,
    activeShops,
    suspendedShops,
    totalUsers,
    totalShopOwners,
    activeUsers,
    suspendedUsers,
    inactiveUsers,
    todayLogins,
    weekLogins,
    failedLoginsHour,
    totalOrders,
    totalRevenueData,
    allFiles,
    recentShops,
    recentAudits,
    failedLoginsSample,
  ] = await Promise.all([
    prisma.shop.count(),
    prisma.shop.count({ where: { status: 'ACTIVE' } }),
    prisma.shop.count({ where: { status: 'SUSPENDED' } }),
    prisma.user.count(),
    prisma.user.count({ where: { role: 'OWNER' } }),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { status: 'SUSPENDED' } }),
    prisma.user.count({ where: { status: 'INACTIVE' } }),
    prisma.auditLog.count({ where: { action: 'LOGIN_SUCCESS', createdAt: { gte: startOfToday } } }),
    prisma.auditLog.count({ where: { action: 'LOGIN_SUCCESS', createdAt: { gte: sevenDaysAgo } } }),
    prisma.auditLog.count({ where: { action: 'LOGIN_FAILED', createdAt: { gte: oneHourAgo } } }),
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
      take: 15,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        shop: { select: { id: true, name: true, shopCode: true } },
      },
    }),
    prisma.auditLog.findMany({
      where: { action: 'LOGIN_FAILED', createdAt: { gte: oneHourAgo } },
      take: 50,
      select: { resourceId: true, ipAddress: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
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

  // Calculate suspicious activity flags (emails or IPs with 3+ failed logins in last hour)
  const failedAttemptsByTarget = {};
  failedLoginsSample.forEach((log) => {
    const key = log.resourceId || log.ipAddress || 'unknown';
    failedAttemptsByTarget[key] = (failedAttemptsByTarget[key] || 0) + 1;
  });
  const suspiciousTargets = Object.entries(failedAttemptsByTarget)
    .filter(([_, count]) => count >= 3)
    .map(([target, count]) => ({ target, count }));

  return {
    kpis: {
      totalShops,
      activeShops,
      suspendedShops,
      totalUsers,
      totalShopOwners,
      activeUsers,
      suspendedUsers,
      inactiveUsers,
      todayLogins,
      weekLogins,
      failedLoginsHour,
      totalOrders,
      totalPlatformRevenue: Number(totalPlatformRevenue.toFixed(2)),
      storage: {
        activeBytes: totalActiveBytes.toString(),
        purgedBytes: totalPurgedBytes.toString(),
      },
    },
    suspiciousTargets,
    recentShops,
    recentAudits,
  };
}

/**
 * Super Admin Creates Shop Owner + Shop
 */
async function createShopOwner(adminUser, { ownerName, ownerEmail, shopName, shopPhone, shopAddress }) {
  const admin = await assertSuperAdmin(adminUser);

  if (!ownerName || !ownerEmail || !shopName) {
    const err = new Error('Owner name, owner email, and shop name are required.');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = ownerEmail.trim().toLowerCase();

  // Verify unique email
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existingUser) {
    const err = new Error('An account with this email address already exists.');
    err.statusCode = 409;
    throw err;
  }

  // Generate temporary password
  const tempPassword = generateTemporaryPassword(12);
  const passwordHash = await argon2.hash(tempPassword, ARGON2_OPTIONS);

  // 1. Create User (mustChangePassword: true, emailVerified: true)
  const newUser = await prisma.user.create({
    data: {
      name: ownerName.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'OWNER',
      status: 'ACTIVE',
      emailVerified: true,
      mustChangePassword: true,
    },
    select: {
      id: true,
      publicId: true,
      name: true,
      email: true,
      role: true,
      status: true,
      emailVerified: true,
      mustChangePassword: true,
      createdAt: true,
    },
  });

  // 2. Create Shop linked to this owner
  const shop = await shopService.createShop(
    {
      name: shopName.trim(),
      phone: shopPhone ? shopPhone.trim() : null,
      address: shopAddress ? shopAddress.trim() : null,
      email: normalizedEmail,
    },
    newUser.id
  );

  // 3. Email the temporary credentials
  await emailService.sendMail({
    to: normalizedEmail,
    subject: 'Your SmartPrint Shop Account Has Been Created',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #0e7490; margin-top: 0;">Welcome to SmartPrint</h2>
        <p style="color: #3f3f46; font-size: 15px; line-height: 1.6;">
          Your SmartPrint shop account for <strong>${shop.name}</strong> has been created by the platform administrator.
        </p>
        <div style="background-color: #f4f4f5; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #71717a;">Login ID (Email):</p>
          <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #18181b;">${normalizedEmail}</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #71717a;">Temporary Password:</p>
          <p style="margin: 0; font-size: 18px; font-weight: 700; font-family: monospace; color: #0e7490; letter-spacing: 1px;">${tempPassword}</p>
        </div>
        <p style="color: #ef4444; font-size: 13px; font-weight: 500;">
          For your security, you are required to change this temporary password immediately on your first login.
        </p>
        <p style="color: #a1a1aa; font-size: 12px; margin-top: 24px; border-top: 1px solid #e4e4e7; padding-top: 16px;">
          SmartPrint Cloud Printing Network &bull; Shop Code: ${shop.shopCode}
        </p>
      </div>
    `,
  }).catch((err) => logger.warn('[Admin] Failed to send shop owner credentials email:', err.message));

  // 4. Log in AuditLog
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      shopId: shop.id,
      action: 'CREATE_SHOP_OWNER',
      resource: 'user',
      resourceId: String(newUser.id),
      newData: {
        email: newUser.email,
        shopId: shop.id,
        shopCode: shop.shopCode,
        shopName: shop.name,
      },
    },
  }).catch((e) => logger.warn('AuditLog error:', e.message));

  logger.info(`[SuperAdmin] Shop owner #${newUser.id} (${newUser.email}) and Shop #${shop.id} created by admin #${admin.id}`);

  return {
    user: newUser,
    shop,
    temporaryPassword: tempPassword,
  };
}

/**
 * List all shops on platform with pagination & filters
 */
async function listAllShops(adminUser, { page = 1, limit = 20, status, search } = {}) {
  await assertSuperAdmin(adminUser);

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
      resource: 'shop',
      resourceId: String(shopId),
      oldData: { status: shop.status, subscriptionTier: shop.subscriptionTier },
      newData: {
        status: status || shop.status,
        reason: reason || 'Administrative status change by Super Admin',
        subscriptionTier: subscriptionTier || shop.subscriptionTier,
      },
    },
  }).catch((e) => logger.warn('AuditLog error:', e.message));

  logger.info(`[SuperAdmin] Shop #${shopId} (${shop.name}) status changed to ${status} by admin #${admin.id}`);
  return updatedShop;
}

/**
 * List all users across the platform
 */
async function listAllUsers(adminUser, { page = 1, limit = 20, role, status, search } = {}) {
  await assertSuperAdmin(adminUser);

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
        emailVerified: true,
        mustChangePassword: true,
        lastLoginAt: true,
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
 * Revoke all active sessions for a user
 */
async function revokeAllUserSessions(adminUserOrId, targetUserId) {
  const adminId = typeof adminUserOrId === 'object' ? adminUserOrId.id : adminUserOrId;
  const targetId = parseInt(targetUserId, 10);

  const result = await prisma.refreshToken.updateMany({
    where: {
      userId: targetId,
      revoked: false,
    },
    data: { revoked: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: 'REVOKE_ALL_SESSIONS',
      resource: 'user',
      resourceId: String(targetId),
      newData: { revokedCount: result.count },
    },
  }).catch((e) => logger.warn('AuditLog error:', e.message));

  return { success: true, revokedCount: result.count };
}

/**
 * Revoke a single active session
 */
async function revokeSession(adminUser, sessionId) {
  const admin = await assertSuperAdmin(adminUser);
  const sId = parseInt(sessionId, 10);

  const session = await prisma.refreshToken.findUnique({
    where: { id: sId },
  });

  if (!session) {
    const err = new Error('Session not found.');
    err.statusCode = 404;
    throw err;
  }

  await prisma.refreshToken.update({
    where: { id: sId },
    data: { revoked: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'REVOKE_SESSION',
      resource: 'session',
      resourceId: String(sId),
      newData: { targetUserId: session.userId },
    },
  }).catch((e) => logger.warn('AuditLog error:', e.message));

  return { success: true };
}

/**
 * Get active sessions / devices for a user
 */
async function getUserSessions(adminUser, targetUserId) {
  await assertSuperAdmin(adminUser);
  const targetId = parseInt(targetUserId, 10);

  const sessions = await prisma.refreshToken.findMany({
    where: {
      userId: targetId,
      revoked: false,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return { sessions };
}

/**
 * Get login history for a specific user
 */
async function getUserLoginHistory(adminUser, targetUserId, { page = 1, limit = 20 } = {}) {
  await assertSuperAdmin(adminUser);
  const targetId = parseInt(targetUserId, 10);
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const where = {
    userId: targetId,
    action: { in: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'PASSWORD_CHANGED', 'LOGOUT'] },
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
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

/**
 * Update user role or status (Suspend, Activate, Inactivate)
 * Immediately cuts off all active sessions when status transitions away from ACTIVE.
 */
async function updateUser(adminUser, targetUserId, { role, status, reason }) {
  const admin = await assertSuperAdmin(adminUser);
  const targetId = parseInt(targetUserId, 10);

  if (targetId === admin.id && (status === 'SUSPENDED' || status === 'INACTIVE')) {
    const err = new Error('Cannot suspend or deactivate your own Super Admin account.');
    err.statusCode = 400;
    throw err;
  }

  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetId },
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

  // If status is changed away from ACTIVE, terminate all active sessions right away!
  if (status && status !== 'ACTIVE') {
    await revokeAllUserSessions(admin.id, targetId);
    logger.info(`[SuperAdmin] Revoked all sessions for user #${targetId} because status was set to ${status}`);
  }

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'USER_UPDATED',
      resource: 'user',
      resourceId: String(targetId),
      oldData: { role: user.role, status: user.status },
      newData: {
        role: role || user.role,
        status: status || user.status,
        reason: reason || 'Administrative update by Super Admin',
      },
    },
  }).catch((e) => logger.warn('AuditLog error:', e.message));

  return updatedUser;
}

/**
 * Reset user password (generates temporary password, sets mustChangePassword = true,
 * revokes all active sessions, and emails the credentials).
 */
async function resetUserPassword(adminUser, targetUserId) {
  const admin = await assertSuperAdmin(adminUser);
  const targetId = parseInt(targetUserId, 10);

  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  const tempPassword = generateTemporaryPassword(12);
  const passwordHash = await argon2.hash(tempPassword, ARGON2_OPTIONS);

  await prisma.user.update({
    where: { id: targetId },
    data: {
      passwordHash,
      mustChangePassword: true,
    },
  });

  // Terminate all existing sessions
  await revokeAllUserSessions(admin.id, targetId);

  // Email temporary password
  await emailService.sendMail({
    to: user.email,
    subject: 'Your SmartPrint Password Has Been Reset',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #0e7490; margin-top: 0;">SmartPrint Password Reset</h2>
        <p style="color: #3f3f46; font-size: 15px; line-height: 1.6;">
          Your password for <strong>${user.email}</strong> has been reset by the platform administrator. All active sessions have been terminated.
        </p>
        <div style="background-color: #f4f4f5; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #71717a;">Temporary Password:</p>
          <p style="margin: 0; font-size: 18px; font-weight: 700; font-family: monospace; color: #0e7490; letter-spacing: 1px;">${tempPassword}</p>
        </div>
        <p style="color: #ef4444; font-size: 13px; font-weight: 500;">
          You will be required to set a new password upon your next login.
        </p>
      </div>
    `,
  }).catch((err) => logger.warn('[Admin] Failed to send password reset email:', err.message));

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'RESET_PASSWORD',
      resource: 'user',
      resourceId: String(targetId),
      newData: { targetUserEmail: user.email },
    },
  }).catch((e) => logger.warn('AuditLog error:', e.message));

  logger.info(`[SuperAdmin] Reset password for user #${targetId} by admin #${admin.id}`);

  return {
    success: true,
    temporaryPassword: tempPassword,
  };
}

/**
 * View platform audit logs
 */
async function getAuditLogs(adminUser, { page = 1, limit = 50, action, shopId, search } = {}) {
  await assertSuperAdmin(adminUser);

  const where = {};
  if (action && action !== 'ALL') where.action = action;
  if (shopId) where.shopId = parseInt(shopId, 10);
  if (search) {
    where.OR = [
      { resource: { contains: search } },
      { resourceId: { contains: search } },
      { action: { contains: search } },
    ];
  }

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
  createShopOwner,
  listAllShops,
  updateShopStatus,
  listAllUsers,
  updateUser,
  revokeSession,
  revokeAllUserSessions,
  getUserSessions,
  getUserLoginHistory,
  resetUserPassword,
  getAuditLogs,
};
