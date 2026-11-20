/**
 * Super Admin Service
 * Platform-wide administration, tenant lifecycle (approve, suspend, activate),
 * user management, platform analytics, session revocation, and security audit log review.
 */
const os = require('os');
const crypto = require('crypto');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
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

  const subscriptionService = require('./subscription.service');
  const subscriptionKPIs = await subscriptionService.getSubscriptionPlatformKPIs();

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

  // Look for users who were auto-suspended due to brute-force in the past 24 hours
  const autoSuspendedAudits = await prisma.auditLog.findMany({
    where: {
      action: 'AUTO_SUSPENDED_BRUTE_FORCE',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    take: 10,
    orderBy: { createdAt: 'desc' },
  });

  const autoSuspendedUserIds = autoSuspendedAudits
    .map((a) => parseInt(a.resourceId, 10))
    .filter(Boolean);

  const autoSuspendedUsers = autoSuspendedUserIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: autoSuspendedUserIds } },
        select: { id: true, email: true, name: true, status: true },
      })
    : [];
  const autoSuspendedMap = new Map(autoSuspendedUsers.map((u) => [u.id, u]));

  // Calculate suspicious activity flags (emails or IPs with 3+ failed logins in last hour)
  const failedAttemptsByTarget = {};
  failedLoginsSample.forEach((log) => {
    const key = log.resourceId || log.ipAddress || 'unknown';
    failedAttemptsByTarget[key] = (failedAttemptsByTarget[key] || 0) + 1;
  });

  const suspiciousTargets = [];

  // Add auto-suspended users first with distinct flag
  autoSuspendedAudits.forEach((audit) => {
    const uId = parseInt(audit.resourceId, 10);
    const u = autoSuspendedMap.get(uId);
    if (u) {
      suspiciousTargets.push({
        email: u.email,
        userId: u.id,
        name: u.name,
        failedAttempts: audit.newData?.threshold || 5,
        isAutoSuspended: u.status === 'SUSPENDED',
        status: u.status,
        timestamp: audit.createdAt,
      });
    }
  });

  // Then add remaining targets with repeated failures
  Object.entries(failedAttemptsByTarget)
    .filter(([_, count]) => count >= 3)
    .forEach(([target, count]) => {
      if (!suspiciousTargets.some((st) => st.email === target)) {
        suspiciousTargets.push({
          email: target,
          failedAttempts: count,
          isAutoSuspended: false,
        });
      }
    });

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
      subscription: subscriptionKPIs,
    },
    subscriptionKPIs,
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
 * List all shops on platform with pagination, filters & sorting
 */
async function listAllShops(adminUser, { page = 1, limit = 50, status, search, tier, subscriptionStatus, sortBy, sortOrder = 'desc', dateFrom, dateTo } = {}) {
  await assertSuperAdmin(adminUser);

  const where = {};
  if (status && status !== 'ALL') {
    where.status = status;
  }
  if (tier && tier !== 'ALL') {
    where.subscriptionTier = tier;
  }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { shopCode: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
      { address: { contains: search } },
    ];
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const allowedSortFields = ['name', 'createdAt', 'status', 'subscriptionTier'];
  const activeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const activeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
  const orderBy = { [activeSortBy]: activeSortOrder };

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [shopsRaw, total] = await Promise.all([
    prisma.shop.findMany({
      where,
      include: {
        _count: { select: { orders: true, printers: true, shopUsers: true } },
        shopSettings: true,
        subscription: true,
        shopUsers: {
          where: { role: 'OWNER' },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy,
      take: parseInt(limit, 10),
      skip: offset,
    }),
    prisma.shop.count({ where }),
  ]);

  const { computeSubscriptionDetails } = require('./subscription.service');

  let shops = shopsRaw.map((s) => {
    const sub = s.subscription || {
      shopId: s.id,
      status: 'TRIAL',
      trialEndsAt: new Date(new Date(s.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000),
      bonusDays: 0,
    };
    const subCalc = computeSubscriptionDetails(sub);

    return {
      ...s,
      tier: s.subscriptionTier,
      owner: s.shopUsers?.[0]?.user || null,
      subscription: {
        ...(s.subscription || {}),
        status: subCalc.status,
        daysRemaining: subCalc.daysRemaining,
        isActive: subCalc.isActive,
        isTrial: subCalc.isTrial,
        effectiveExpiryDate: subCalc.effectiveExpiryDate,
        bonusDays: sub.bonusDays || 0,
        suspendedReason: sub.suspendedReason || null,
        plan: sub.plan || (subCalc.isTrial ? 'TRIAL' : 'MONTHLY'),
      },
    };
  });

  if (subscriptionStatus && subscriptionStatus !== 'ALL') {
    shops = shops.filter((s) => s.subscription?.status === subscriptionStatus);
  }

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
 * List all users across the platform with pagination, filters & sorting
 */
async function listAllUsers(adminUser, { page = 1, limit = 50, role, status, search, sortBy, sortOrder = 'desc', dateFrom, dateTo } = {}) {
  await assertSuperAdmin(adminUser);

  const where = {};
  if (role && role !== 'ALL') where.role = role;
  if (status && status !== 'ALL') where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { shopUsers: { some: { shop: { name: { contains: search } } } } },
    ];
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const allowedSortFields = ['name', 'email', 'role', 'status', 'createdAt', 'lastLoginAt'];
  const activeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const activeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
  const orderBy = { [activeSortBy]: activeSortOrder };

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
        adminNote: true,
        maxActiveSessions: true,
        lastLoginAt: true,
        createdAt: true,
        shopUsers: {
          include: {
            shop: { select: { id: true, name: true, shopCode: true } },
          },
        },
      },
      orderBy,
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

/**
 * Dedicated Super Admin Portal Login
 * Strictly enforces that user.role === 'SUPER_ADMIN'
 */
async function adminLogin({ email, password, ipAddress, userAgent }) {
  const authService = require('./auth.service');
  const result = await authService.login({ email, password, ipAddress, userAgent });

  if (result.user.role !== 'SUPER_ADMIN') {
    // Revoke the refresh token just issued because user is not a Super Admin
    if (result.refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: result.refreshToken },
        data: { revoked: true },
      }).catch(() => {});
    }
    const err = new Error('Access denied. This console is restricted to Super Administrator accounts.');
    err.statusCode = 403;
    throw err;
  }

  return result;
}

/**
 * Super Admin Creates Any User (Owner, Manager, Staff, Super Admin)
 */
async function createUser(adminUser, { name, email, password, role = 'OWNER', status = 'ACTIVE', shopId }) {
  const admin = await assertSuperAdmin(adminUser);

  if (!name || !email) {
    const err = new Error('Name and email are required.');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existing) {
    const err = new Error('A user account with this email address already exists.');
    err.statusCode = 409;
    throw err;
  }

  let tempPass = null;
  let passwordToHash = password;
  let mustChangePassword = false;

  if (!passwordToHash) {
    tempPass = generateTemporaryPassword(12);
    passwordToHash = tempPass;
    mustChangePassword = true;
  }

  const passwordHash = await argon2.hash(passwordToHash, ARGON2_OPTIONS);

  const newUser = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: role || 'OWNER',
      status: status || 'ACTIVE',
      emailVerified: true,
      mustChangePassword,
    },
    select: {
      id: true,
      publicId: true,
      name: true,
      email: true,
      role: true,
      status: true,
      mustChangePassword: true,
      createdAt: true,
    },
  });

  // Attach to shop if specified
  if (shopId) {
    const parsedShopId = parseInt(shopId, 10);
    const shop = await prisma.shop.findUnique({ where: { id: parsedShopId } });
    if (shop) {
      await prisma.shopUser.create({
        data: {
          shopId: parsedShopId,
          userId: newUser.id,
          role: role === 'SUPER_ADMIN' ? 'OWNER' : role,
          status: 'ACTIVE',
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'CREATE_USER',
      resource: 'user',
      resourceId: String(newUser.id),
      newData: { email: newUser.email, role: newUser.role, status: newUser.status, shopId },
    },
  }).catch((e) => logger.warn('AuditLog error:', e.message));

  return {
    user: newUser,
    temporaryPassword: tempPass,
  };
}

/**
 * Super Admin Permanently Deletes a User
 */
async function deleteUser(adminUser, targetUserId) {
  const admin = await assertSuperAdmin(adminUser);
  const targetId = parseInt(targetUserId, 10);

  if (targetId === admin.id) {
    const err = new Error('Cannot delete your own active Super Admin account.');
    err.statusCode = 400;
    throw err;
  }

  const user = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  await prisma.$transaction(async (tx) => {
    // Cascades remove refreshTokens, emailOtps, shopUsers, notifications
    await tx.refreshToken.deleteMany({ where: { userId: targetId } });
    await tx.emailOtp.deleteMany({ where: { userId: targetId } });
    await tx.shopUser.deleteMany({ where: { userId: targetId } });
    await tx.notification.deleteMany({ where: { userId: targetId } });
    await tx.user.delete({ where: { id: targetId } });
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'DELETE_USER',
      resource: 'user',
      resourceId: String(targetId),
      oldData: { name: user.name, email: user.email, role: user.role },
    },
  }).catch((e) => logger.warn('AuditLog error:', e.message));

  logger.info(`[SuperAdmin] Deleted user #${targetId} (${user.email}) by admin #${admin.id}`);
  return { success: true, message: `User ${user.email} deleted permanently.` };
}

/**
 * Super Admin Creates a Shop
 */
async function createShopDirect(adminUser, { name, address, phone, email, ownerId }) {
  const admin = await assertSuperAdmin(adminUser);

  if (!name) {
    const err = new Error('Shop name is required.');
    err.statusCode = 400;
    throw err;
  }

  let creatorUserId = admin.id;
  if (ownerId) {
    const parsedOwnerId = parseInt(ownerId, 10);
    const owner = await prisma.user.findUnique({ where: { id: parsedOwnerId } });
    if (owner) creatorUserId = owner.id;
  }

  const shop = await shopService.createShop(
    {
      name: name.trim(),
      address: address ? address.trim() : null,
      phone: phone ? phone.trim() : null,
      email: email ? email.trim() : null,
    },
    creatorUserId
  );

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      shopId: shop.id,
      action: 'CREATE_SHOP',
      resource: 'shop',
      resourceId: String(shop.id),
      newData: { name: shop.name, shopCode: shop.shopCode, creatorUserId },
    },
  }).catch((e) => logger.warn('AuditLog error:', e.message));

  return shop;
}

/**
 * Super Admin Permanently Deletes a Shop
 * Performs a safe cascade transaction cleaning up all child relations
 */
async function deleteShop(adminUser, shopId) {
  const admin = await assertSuperAdmin(adminUser);
  const sId = parseInt(shopId, 10);

  const shop = await prisma.shop.findUnique({ where: { id: sId } });
  if (!shop) {
    const err = new Error('Shop not found.');
    err.statusCode = 404;
    throw err;
  }

  await prisma.$transaction(async (tx) => {
    // 1. Gather orders and order files
    const orders = await tx.order.findMany({ where: { shopId: sId }, select: { id: true } });
    const orderIds = orders.map((o) => o.id);

    if (orderIds.length > 0) {
      const files = await tx.orderFile.findMany({ where: { orderId: { in: orderIds } }, select: { id: true } });
      const fileIds = files.map((f) => f.id);

      if (fileIds.length > 0) {
        await tx.printJob.deleteMany({ where: { fileId: { in: fileIds } } });
      }

      await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.orderStatusLog.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.expiryLog.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.orderFile.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.order.deleteMany({ where: { shopId: sId } });
    }

    // 2. Delete customer sessions
    await tx.customerSession.deleteMany({ where: { shopId: sId } });

    // 3. Delete printers and configuration
    await tx.printer.deleteMany({ where: { shopId: sId } });
    await tx.pricingRule.deleteMany({ where: { shopId: sId } });
    await tx.additionalService.deleteMany({ where: { shopId: sId } });
    await tx.shopSettings.deleteMany({ where: { shopId: sId } });
    await tx.shopUser.deleteMany({ where: { shopId: sId } });

    // 4. Delete the shop itself
    await tx.shop.delete({ where: { id: sId } });
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'DELETE_SHOP',
      resource: 'shop',
      resourceId: String(sId),
      oldData: { name: shop.name, shopCode: shop.shopCode },
    },
  }).catch((e) => logger.warn('AuditLog error:', e.message));

  logger.info(`[SuperAdmin] Shop #${sId} (${shop.name}) deleted permanently by admin #${admin.id}`);
  return { success: true, message: `Shop "${shop.name}" and all associated data deleted permanently.` };
}

/**
 * List all orders across all shops
 */
async function listAllOrders(adminUser, { page = 1, limit = 20, search, status, shopId } = {}) {
  await assertSuperAdmin(adminUser);

  const where = {};
  if (status && status !== 'ALL') where.status = status;
  if (shopId) where.shopId = parseInt(shopId, 10);
  if (search) {
    where.OR = [
      { orderNumber: { contains: search } },
      { customerName: { contains: search } },
      { customerPhone: { contains: search } },
      { customerEmail: { contains: search } },
    ];
  }

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        shop: { select: { id: true, name: true, shopCode: true } },
        orderFiles: {
          select: {
            id: true,
            fileName: true,
            fileSizeBytes: true,
            pageCount: true,
            colorMode: true,
            isPurged: true,
          },
        },
        payments: { select: { id: true, amount: true, status: true, paymentMethod: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
      skip: offset,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)) || 1,
    },
  };
}

/**
 * Permanently delete an order
 */
async function deleteOrder(adminUser, orderId) {
  const admin = await assertSuperAdmin(adminUser);
  const oId = parseInt(orderId, 10);

  const order = await prisma.order.findUnique({
    where: { id: oId },
    select: { id: true, orderNumber: true, shopId: true },
  });
  if (!order) {
    const err = new Error('Order not found.');
    err.statusCode = 404;
    throw err;
  }

  await prisma.$transaction(async (tx) => {
    const files = await tx.orderFile.findMany({ where: { orderId: oId }, select: { id: true } });
    const fileIds = files.map((f) => f.id);
    if (fileIds.length > 0) {
      await tx.printJob.deleteMany({ where: { fileId: { in: fileIds } } });
    }
    await tx.payment.deleteMany({ where: { orderId: oId } });
    await tx.orderStatusLog.deleteMany({ where: { orderId: oId } });
    await tx.expiryLog.deleteMany({ where: { orderId: oId } });
    await tx.orderFile.deleteMany({ where: { orderId: oId } });
    await tx.order.delete({ where: { id: oId } });
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      shopId: order.shopId,
      action: 'DELETE_ORDER',
      resource: 'order',
      resourceId: String(oId),
      oldData: { orderNumber: order.orderNumber },
    },
  }).catch((e) => logger.warn('AuditLog error:', e.message));

  return { success: true, message: `Order #${order.orderNumber} deleted permanently.` };
}

/**
 * List all printers across the entire network
 */
async function listAllPrinters(adminUser, { shopId } = {}) {
  await assertSuperAdmin(adminUser);

  const where = {};
  if (shopId) where.shopId = parseInt(shopId, 10);

  const printers = await prisma.printer.findMany({
    where,
    include: {
      shop: { select: { id: true, name: true, shopCode: true } },
      _count: { select: { printJobs: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return { printers };
}

/**
 * Delete a printer
 */
async function deletePrinter(adminUser, printerId) {
  const admin = await assertSuperAdmin(adminUser);
  const pId = parseInt(printerId, 10);

  const printer = await prisma.printer.findUnique({ where: { id: pId } });
  if (!printer) {
    const err = new Error('Printer not found.');
    err.statusCode = 404;
    throw err;
  }

  await prisma.printer.delete({ where: { id: pId } });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      shopId: printer.shopId,
      action: 'DELETE_PRINTER',
      resource: 'printer',
      resourceId: String(pId),
      oldData: { name: printer.name },
    },
  }).catch((e) => logger.warn('AuditLog error:', e.message));

  return { success: true };
}

/**
 * List all payments platform-wide
 */
async function listAllPayments(adminUser, { page = 1, limit = 25, status, search } = {}) {
  await assertSuperAdmin(adminUser);

  const where = {};
  if (status && status !== 'ALL') where.status = status;
  if (search) {
    where.OR = [
      { gatewayPaymentId: { contains: search } },
      { gatewayOrderId: { contains: search } },
    ];
  }

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            shop: { select: { id: true, name: true, shopCode: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
      skip: offset,
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    payments,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)) || 1,
    },
  };
}

/**
 * Get Server Diagnostics & System Telemetry
 */
async function getSystemHealth(adminUser) {
  await assertSuperAdmin(adminUser);

  const mem = process.memoryUsage();
  const [
    userCount,
    shopCount,
    orderCount,
    fileCount,
    paymentCount,
    printerCount,
    auditCount,
    sessionCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.shop.count(),
    prisma.order.count(),
    prisma.orderFile.count(),
    prisma.payment.count(),
    prisma.printer.count(),
    prisma.auditLog.count(),
    prisma.refreshToken.count(),
  ]);

  return {
    process: {
      nodeVersion: process.version,
      pid: process.pid,
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        rssBytes: mem.rss,
        heapTotalBytes: mem.heapTotal,
        heapUsedBytes: mem.heapUsed,
        externalBytes: mem.external,
      },
    },
    system: {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemBytes: os.totalmem(),
      freeMemBytes: os.freemem(),
      uptimeSeconds: Math.floor(os.uptime()),
    },
    databaseCounts: {
      users: userCount,
      shops: shopCount,
      orders: orderCount,
      files: fileCount,
      payments: paymentCount,
      printers: printerCount,
      auditLogs: auditCount,
      sessions: sessionCount,
    },
  };
}

/**
 * Bulk action on users (Suspend, Activate, Revoke Sessions)
 * Writes an individual AuditLog per affected user with admin.id as actor.
 */
async function bulkActionUsers(adminUser, { userIds, action }) {
  const admin = await assertSuperAdmin(adminUser);
  if (!Array.isArray(userIds) || userIds.length === 0) {
    const err = new Error('userIds must be a non-empty array of user IDs.');
    err.statusCode = 400;
    throw err;
  }

  const allowedActions = ['SUSPEND', 'ACTIVATE', 'REVOKE_SESSIONS'];
  if (!allowedActions.includes(action)) {
    const err = new Error(`Invalid action. Must be one of: ${allowedActions.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const results = [];
  for (const id of userIds) {
    const targetId = parseInt(id, 10);
    if (isNaN(targetId)) continue;

    // Prevent Super Admin from suspending or revoking their own account via bulk action
    if (targetId === admin.id && action !== 'REVOKE_SESSIONS') {
      continue;
    }

    try {
      if (action === 'SUSPEND') {
        await prisma.user.update({
          where: { id: targetId },
          data: { status: 'SUSPENDED' },
        });
        await prisma.refreshToken.updateMany({
          where: { userId: targetId, revoked: false },
          data: { revoked: true },
        });
        await prisma.auditLog.create({
          data: {
            userId: admin.id,
            action: 'BULK_ACTION_SUSPEND',
            resource: 'User',
            resourceId: String(targetId),
            newData: { reason: 'Bulk suspended by Super Admin' },
          },
        });
      } else if (action === 'ACTIVATE') {
        await prisma.user.update({
          where: { id: targetId },
          data: { status: 'ACTIVE' },
        });
        await prisma.auditLog.create({
          data: {
            userId: admin.id,
            action: 'BULK_ACTION_ACTIVATE',
            resource: 'User',
            resourceId: String(targetId),
            newData: { reason: 'Bulk reactivated by Super Admin' },
          },
        });
      } else if (action === 'REVOKE_SESSIONS') {
        await prisma.refreshToken.updateMany({
          where: { userId: targetId, revoked: false },
          data: { revoked: true },
        });
        await prisma.auditLog.create({
          data: {
            userId: admin.id,
            action: 'BULK_ACTION_REVOKE_SESSIONS',
            resource: 'User',
            resourceId: String(targetId),
            newData: { reason: 'Bulk forced logout by Super Admin' },
          },
        });
      }
      results.push({ id: targetId, success: true });
    } catch (e) {
      logger.error(`[BulkAction] Error processing user #${targetId}:`, e.message);
      results.push({ id: targetId, success: false, error: e.message });
    }
  }

  return { action, processedCount: results.filter((r) => r.success).length, total: userIds.length, results };
}

/**
 * Update internal admin-only note on a user
 */
async function updateAdminNote(adminUser, targetUserId, note) {
  const admin = await assertSuperAdmin(adminUser);
  const targetId = parseInt(targetUserId, 10);

  const existing = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, adminNote: true, email: true },
  });
  if (!existing) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: { adminNote: note || null },
    select: { id: true, email: true, adminNote: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'USER_NOTE_UPDATED',
      resource: 'User',
      resourceId: String(targetId),
      oldData: { adminNote: existing.adminNote },
      newData: { adminNote: updated.adminNote },
    },
  });

  return updated;
}

/**
 * Update concurrent active session limit on a user
 */
async function updateSessionLimit(adminUser, targetUserId, maxActiveSessions) {
  const admin = await assertSuperAdmin(adminUser);
  const targetId = parseInt(targetUserId, 10);

  const limitVal = maxActiveSessions !== null && maxActiveSessions !== undefined && maxActiveSessions !== ''
    ? parseInt(maxActiveSessions, 10)
    : null;

  if (limitVal !== null && (isNaN(limitVal) || limitVal < 1)) {
    const err = new Error('maxActiveSessions must be a positive integer or null (to use system default 3).');
    err.statusCode = 400;
    throw err;
  }

  const existing = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, maxActiveSessions: true, email: true },
  });
  if (!existing) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: { maxActiveSessions: limitVal },
    select: { id: true, email: true, maxActiveSessions: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'USER_SESSION_LIMIT_UPDATED',
      resource: 'User',
      resourceId: String(targetId),
      oldData: { maxActiveSessions: existing.maxActiveSessions },
      newData: { maxActiveSessions: updated.maxActiveSessions },
    },
  });

  return updated;
}

/**
 * Super Admin Impersonates Shop Owner / User (Support "Login As")
 * Issues 15-minute token, records IMPERSONATION_START in AuditLog
 */
async function impersonateUser(adminUser, targetUserId) {
  const admin = await assertSuperAdmin(adminUser);
  const targetId = parseInt(targetUserId, 10);

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      publicId: true,
      name: true,
      email: true,
      role: true,
      status: true,
      shopUsers: {
        include: {
          shop: { select: { id: true, name: true, shopCode: true } },
        },
      },
    },
  });

  if (!target) {
    const err = new Error('Target user account not found.');
    err.statusCode = 404;
    throw err;
  }

  if (target.status !== 'ACTIVE') {
    const err = new Error(`Cannot impersonate an account with status '${target.status}'. Please activate the account first.`);
    err.statusCode = 400;
    throw err;
  }

  // Issue 15-minute impersonation access token
  const impersonationToken = jwt.sign(
    {
      sub: target.id,
      publicId: target.publicId,
      email: target.email,
      role: target.role,
      isImpersonated: true,
      impersonatedBy: admin.id,
      adminEmail: admin.email,
    },
    process.env.JWT_SECRET || 'smartprint_jwt_fallback_secret_production_guard_9281749102',
    { expiresIn: '15m' }
  );

  // Write immediate AuditLog
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'IMPERSONATION_START',
      resource: 'User',
      resourceId: String(target.id),
      newData: {
        targetEmail: target.email,
        targetRole: target.role,
        targetName: target.name,
        expiresIn: '15m',
      },
    },
  });

  logger.info(`[Impersonation] Super Admin #${admin.id} (${admin.email}) started impersonating user #${target.id} (${target.email})`);

  return {
    accessToken: impersonationToken,
    user: target,
    impersonatedBy: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
    },
    expiresInMinutes: 15,
  };
}

/**
 * Broadcast platform message to shop owners
 */
async function broadcastMessage(adminUser, { subject, message, targetUserIds }) {
  const admin = await assertSuperAdmin(adminUser);

  if (!subject || !message) {
    const err = new Error('Subject and message are required for broadcast.');
    err.statusCode = 400;
    throw err;
  }

  let recipients;
  if (Array.isArray(targetUserIds) && targetUserIds.length > 0) {
    recipients = await prisma.user.findMany({
      where: { id: { in: targetUserIds.map((id) => parseInt(id, 10)) }, status: 'ACTIVE' },
      select: { id: true, email: true, name: true },
    });
  } else {
    recipients = await prisma.user.findMany({
      where: { role: 'OWNER', status: 'ACTIVE' },
      select: { id: true, email: true, name: true },
    });
  }

  // Send via email provider
  const emailProvider = emailService.getEmailProvider();
  let deliveredCount = 0;
  for (const r of recipients) {
    try {
      if (emailProvider && typeof emailProvider.sendEmail === 'function') {
        await emailProvider.sendEmail({
          to: r.email,
          subject: `[SmartPrint Platform] ${subject}`,
          text: `Dear ${r.name || 'Shop Owner'},\n\n${message}\n\nSmartPrint Administration`,
        });
        deliveredCount++;
      }
    } catch (err) {
      logger.warn(`[Broadcast] Failed to send email to ${r.email}:`, err.message);
    }
  }

  // Log single AuditLog entry
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'PLATFORM_BROADCAST',
      resource: 'Platform',
      resourceId: 'all',
      newData: {
        subject: subject.slice(0, 100),
        recipientCount: recipients.length,
        deliveredCount,
        sampleRecipients: recipients.slice(0, 3).map((r) => r.email),
      },
    },
  });

  return {
    success: true,
    subject,
    recipientCount: recipients.length,
    deliveredCount,
  };
}

module.exports = {
  assertSuperAdmin,
  adminLogin,
  getPlatformOverview,
  createShopOwner,
  createUser,
  deleteUser,
  listAllShops,
  createShopDirect,
  deleteShop,
  updateShopStatus,
  listAllUsers,
  updateUser,
  bulkActionUsers,
  updateAdminNote,
  updateSessionLimit,
  impersonateUser,
  broadcastMessage,
  revokeSession,
  revokeAllUserSessions,
  getUserSessions,
  getUserLoginHistory,
  resetUserPassword,
  listAllOrders,
  deleteOrder,
  listAllPrinters,
  deletePrinter,
  listAllPayments,
  getSystemHealth,
  getAuditLogs,
};
