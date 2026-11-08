// ============================================================
// Shop Service
// ============================================================
const { prisma } = require('../database/client');
const { generateShopCode } = require('../utils/generators');
const logger = require('../utils/logger');

// ── Create Shop ───────────────────────────────────────────

async function createShop({ name, address, phone, email, logoUrl }, userId) {
  // Generate a unique shop code (retry up to 5 times if collision)
  let shopCode;
  let attempts = 0;
  do {
    shopCode = generateShopCode();
    attempts++;
    const existing = await prisma.shop.findUnique({ where: { shopCode } });
    if (!existing) break;
    if (attempts >= 5) throw new Error('Failed to generate a unique shop code. Please try again.');
  } while (true);

  const shop = await prisma.$transaction(async (tx) => {
    const newShop = await tx.shop.create({
      data: {
        shopCode,
        name,
        address: address || null,
        phone: phone || null,
        email: email || null,
        logoUrl: logoUrl || null,
        status: 'ACTIVE',
      },
    });

    // Add the creator as OWNER
    await tx.shopUser.create({
      data: {
        shopId: newShop.id,
        userId,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });

    // Create default shop settings
    await tx.shopSettings.create({
      data: {
        shopId: newShop.id,
        paymentEnabled: true,
        directPrintEnabled: true,
        manualPrintEnabled: true,
        defaultExpiryHours: 1,
        defaultExpiryOption: '1h',
        allowedExpiryOptions: '15m,1h,3h,8h',
        maxUploadSizeMb: 50,
        acceptedFormats: 'pdf,png,jpg,jpeg,docx,txt',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
      },
    });

    // Create default standard pricing rules so customer uploads and price calculation work immediately
    const defaultPricingRules = [
      { name: 'B&W A4 Simplex', colorMode: 'BLACK_WHITE', paperSize: 'A4', duplexMode: 'SIMPLEX', pricePerPage: 1.50 },
      { name: 'B&W A4 Duplex', colorMode: 'BLACK_WHITE', paperSize: 'A4', duplexMode: 'DUPLEX_LONG_EDGE', pricePerPage: 2.00 },
      { name: 'Color A4 Simplex', colorMode: 'COLOR', paperSize: 'A4', duplexMode: 'SIMPLEX', pricePerPage: 5.00 },
      { name: 'Color A4 Duplex', colorMode: 'COLOR', paperSize: 'A4', duplexMode: 'DUPLEX_LONG_EDGE', pricePerPage: 8.00 },
    ];
    for (const rule of defaultPricingRules) {
      await tx.pricingRule.create({
        data: { shopId: newShop.id, ...rule, isActive: true },
      });
    }

    // Create standard optional finishing services
    await tx.additionalService.create({
      data: { shopId: newShop.id, name: 'Soft Spiral Binding', description: 'Plastic coil spiral binding', price: 30.00, isActive: true },
    });
    await tx.additionalService.create({
      data: { shopId: newShop.id, name: 'Gloss Sheet Lamination', description: 'Thermal waterproof lamination', price: 20.00, isActive: true },
    });

    return newShop;
  });

  logger.info(`Shop created: "${name}" (ID: ${shop.id}, Code: ${shopCode}) by user ${userId}`);
  return shop;
}

// ── Get Shop (with membership check) ─────────────────────

async function getShop(shopId, userId) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || membership.status !== 'ACTIVE') {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  return prisma.shop.findUnique({
    where: { id: shopId },
    include: {
      shopSettings: true,
      shopUsers: {
        include: {
          user: { select: { id: true, publicId: true, name: true, email: true, role: true } },
        },
      },
      _count: { select: { orders: true, printers: true } },
    },
  });
}

// ── List My Shops ─────────────────────────────────────────

async function listMyShops(userId) {
  const memberships = await prisma.shopUser.findMany({
    where: { userId, status: 'ACTIVE' },
    include: {
      shop: {
        include: {
          shopSettings: true,
          _count: { select: { orders: true, printers: true } },
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });

  return memberships.map((m) => ({
    ...m.shop,
    myRole: m.role,
  }));
}

// ── Update Shop ───────────────────────────────────────────

async function updateShop(shopId, userId, updates) {
  // Ensure user is OWNER or MANAGER
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || !['OWNER', 'MANAGER'].includes(membership.role)) {
    const err = new Error('Only owners and managers can update shop details.');
    err.statusCode = 403;
    throw err;
  }

  const allowed = ['name', 'address', 'phone', 'email', 'logoUrl'];
  const data = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) data[key] = updates[key];
  }

  const shop = await prisma.shop.update({ where: { id: shopId }, data });
  logger.info(`Shop updated: ID ${shopId} by user ${userId}`);
  return shop;
}

// ── Update Shop Settings ──────────────────────────────────

async function updateShopSettings(shopId, userId, settings) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || !['OWNER', 'MANAGER'].includes(membership.role)) {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  const allowed = [
    'paymentEnabled',
    'manualPrintEnabled',
    'directPrintEnabled',
    'defaultExpiryHours',
    'maxUploadSizeMb',
    'acceptedFormats',
    'currency',
    'timezone',
  ];
  const data = {};
  for (const key of allowed) {
    if (settings[key] !== undefined) data[key] = settings[key];
  }

  const updated = await prisma.shopSettings.upsert({
    where: { shopId },
    update: data,
    create: { shopId, ...data },
  });

  logger.info(`Shop settings updated: shopId ${shopId} by user ${userId}`);
  return updated;
}

// ── QR Code Management ────────────────────────────────────

const qrService = require('./qr.service');

async function getShopQR(shopId, userId, requestedBaseUrl = null) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || membership.status !== 'ACTIVE') {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  const frontendUrl = requestedBaseUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
  return qrService.generateShopQRCode(shop.shopCode, frontendUrl);
}

async function regenerateShopCode(shopId, userId, requestedBaseUrl = null) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || membership.role !== 'OWNER') {
    const err = new Error('Only the shop owner can regenerate the shop QR code.');
    err.statusCode = 403;
    throw err;
  }

  // Generate new non-colliding shop code
  let newCode;
  let attempts = 0;
  while (!newCode && attempts < 5) {
    attempts++;
    const candidate = generateShopCode();
    const existing = await prisma.shop.findUnique({ where: { shopCode: candidate } });
    if (!existing) newCode = candidate;
  }

  const updatedShop = await prisma.shop.update({
    where: { id: shopId },
    data: { shopCode: newCode },
  });

  logger.info(`Shop QR regenerated: Shop ${shopId} new code: ${newCode} by user ${userId}`);
  const frontendUrl = requestedBaseUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
  const qrData = await qrService.generateShopQRCode(updatedShop.shopCode, frontendUrl);

  return {
    shop: updatedShop,
    ...qrData,
  };
}

// ── Pricing Rules Management ──────────────────────────────

async function getShopPricingRules(shopId, userId) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || membership.status !== 'ACTIVE') {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  return prisma.pricingRule.findMany({
    where: { shopId },
    orderBy: [{ paperSize: 'asc' }, { colorMode: 'asc' }],
  });
}

async function upsertPricingRules(shopId, userId, rules) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || !['OWNER', 'MANAGER'].includes(membership.role)) {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  // Transactionally replace or upsert rules
  return prisma.$transaction(async (tx) => {
    // Delete existing rules for this shop
    await tx.pricingRule.deleteMany({ where: { shopId } });

    // Insert new rules
    const created = [];
    for (const r of rules) {
      const rule = await tx.pricingRule.create({
        data: {
          shopId,
          name: r.name || `${r.paperSize} ${r.colorMode} ${r.duplexMode}`,
          colorMode: r.colorMode,
          paperSize: r.paperSize,
          duplexMode: r.duplexMode || 'SIMPLEX',
          pricePerPage: Number(r.pricePerPage),
          isActive: r.isActive ?? true,
        },
      });
      created.push(rule);
    }
    return created;
  });
}

// ── Additional Services Management ────────────────────────

async function getShopServices(shopId, userId) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || membership.status !== 'ACTIVE') {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  return prisma.additionalService.findMany({
    where: { shopId },
    orderBy: { createdAt: 'asc' },
  });
}

async function createShopService(shopId, userId, data) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || !['OWNER', 'MANAGER'].includes(membership.role)) {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  return prisma.additionalService.create({
    data: {
      shopId,
      name: data.name,
      description: data.description || null,
      price: Number(data.price),
      isActive: data.isActive ?? true,
    },
  });
}

async function deleteShopService(shopId, userId, serviceId) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || !['OWNER', 'MANAGER'].includes(membership.role)) {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  return prisma.additionalService.delete({
    where: { id: serviceId },
  });
}

// ── Shop Orders Management ────────────────────────────────

// ── Shop Orders Management ────────────────────────────────

const VALID_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'PAYMENT_PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'],
  CONFIRMED: ['ACCEPTED', 'PROCESSING', 'PRINTING', 'REJECTED', 'CANCELLED'],
  PAYMENT_PENDING: ['ACCEPTED', 'CANCELLED', 'EXPIRED'],
  ACCEPTED: ['PROCESSING', 'PRINTING', 'READY', 'CANCELLED'],
  PROCESSING: ['PRINTING', 'PRINTED', 'READY', 'CANCELLED'],
  PRINTING: ['PRINTED', 'READY', 'ACCEPTED', 'CANCELLED'],
  PRINTED: ['READY', 'COLLECTED', 'COMPLETED', 'PRINTING'],
  READY: ['COLLECTED', 'COMPLETED'],
  COLLECTED: ['COMPLETED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
  EXPIRED: [],
};

function isValidTransition(from, to) {
  const allowed = VALID_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

async function getShopOrders(shopId, userId, { status, search, startDate, endDate, limit = 50, offset = 0 } = {}) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || membership.status !== 'ACTIVE') {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  const where = { shopId };
  if (status && status !== 'ALL') {
    where.status = status;
  }
  if (search && search.trim()) {
    where.orderNumber = { contains: search.trim().toUpperCase() };
  }
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        orderFiles: {
          include: {
            printConfiguration: true,
            orderFileServices: { include: { additionalService: true } },
            printJobs: { select: { id: true, status: true, attemptNumber: true } },
          },
        },
        session: { select: { publicId: true, customerName: true, customerPhone: true, expiresAt: true, status: true } },
        payments: { select: { id: true, amount: true, status: true, method: true, paidAt: true, referenceId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders: orders.map((o) => {
      const totalPages = o.orderFiles.reduce((acc, f) => {
        const pages = f.pageCount || 1;
        const copies = f.printConfiguration?.copies || 1;
        return acc + (pages * copies);
      }, 0);

      const latestPayment = o.payments?.[0];

      return {
        ...o,
        totalAmount: Number(o.totalAmount),
        totalPages,
        customerName: o.session?.customerName || null,
        customerPhone: o.session?.customerPhone || null,
        paymentStatus: latestPayment?.status || 'PENDING',
        paymentMethod: latestPayment?.method || 'COUNTER',
        orderFiles: (o.orderFiles || []).map((f) => ({
          ...f,
          fileSizeBytes: (f.fileSizeBytes || 0).toString(),
          printJobsCount: (f.printJobs || []).length,
        })),
      };
    }),
    total,
  };
}

async function getOrderDetails(shopId, userId, orderId) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || membership.status !== 'ACTIVE') {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, shopId },
    include: {
      orderFiles: {
        include: {
          printConfiguration: true,
          orderFileServices: { include: { additionalService: true } },
          printJobs: {
            orderBy: { attemptNumber: 'desc' },
          },
        },
      },
      session: {
        select: {
          publicId: true,
          customerName: true,
          customerPhone: true,
          expiresAt: true,
          status: true,
          createdAt: true,
        },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
      },
      statusLogs: {
        orderBy: { createdAt: 'desc' },
      },
      expiryLogs: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!order) {
    const err = new Error('Order not found.');
    err.statusCode = 404;
    throw err;
  }

  const totalPages = order.orderFiles.reduce((acc, f) => {
    const pages = f.pageCount || 1;
    const copies = f.printConfiguration?.copies || 1;
    return acc + (pages * copies);
  }, 0);

  return {
    ...order,
    customerName: order.session?.customerName || null,
    customerPhone: order.session?.customerPhone || null,
    totalAmount: Number(order.totalAmount),
    totalPages,
    orderFiles: (order.orderFiles || []).map((f) => ({
      ...f,
      fileSizeBytes: (f.fileSizeBytes || 0).toString(),
      printJobsCount: (f.printJobs || []).length,
      hasPrintedBefore: (f.printJobs || []).length > 0,
    })),
  };
}

async function updateOrderStatus(shopId, userId, orderId, { status, reason }) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || membership.status !== 'ACTIVE') {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, shopId },
  });

  if (!order) {
    const err = new Error('Order not found.');
    err.statusCode = 404;
    throw err;
  }

  const oldStatus = order.status;

  // Validate state transition
  const allowedNext = VALID_TRANSITIONS[oldStatus] || [];
  if (oldStatus !== status && allowedNext.length > 0 && !allowedNext.includes(status)) {
    const err = new Error(`Invalid status transition from "${oldStatus}" to "${status}". Allowed: ${allowedNext.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status },
  });

  await prisma.orderStatusLog.create({
    data: {
      orderId,
      fromStatus: oldStatus,
      toStatus: status,
      changedBy: userId,
      note: reason || `Status updated to ${status} by shop staff`,
    },
  });

  // Real-Time Broadcast
  try {
    const { emitToShop } = require('../socket');
    emitToShop(shopId, 'order:status_changed', {
      orderId,
      orderNumber: updated.orderNumber,
      fromStatus: oldStatus,
      toStatus: status,
      timestamp: new Date(),
    });
  } catch (wsErr) {
    logger.warn(`Failed to broadcast order:status_changed: ${wsErr.message}`);
  }

  return updated;
}

// ── Manual Printing Workflow & Reprint Tracking ───────────

async function recordPrintJob(shopId, userId, orderIdOrParams, fileIdArg) {
  let orderId = orderIdOrParams;
  let fileId = fileIdArg;
  if (typeof orderIdOrParams === 'object' && orderIdOrParams !== null) {
    orderId = orderIdOrParams.orderId;
    fileId = orderIdOrParams.fileId;
  }
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || membership.status !== 'ACTIVE') {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  const file = await prisma.orderFile.findFirst({
    where: { id: fileId, orderId },
    include: {
      printJobs: { orderBy: { attemptNumber: 'desc' } },
      order: true,
    },
  });

  if (!file || file.order.shopId !== shopId) {
    const err = new Error('File not found in this shop order.');
    err.statusCode = 404;
    throw err;
  }

  // Privacy & Expiry Protection: Expired documents must NEVER be available for a print attempt
  const { assertDocumentNotExpired } = require('./expiry.service');
  assertDocumentNotExpired(file);

  const previousAttempts = file.printJobs.length;
  const newAttemptNumber = previousAttempts + 1;
  const isReprint = previousAttempts > 0;

  const printJob = await prisma.printJob.create({
    data: {
      fileId,
      status: 'COMPLETED',
      attemptNumber: newAttemptNumber,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  // Update file status to PRINTED
  await prisma.orderFile.update({
    where: { id: fileId },
    data: { status: 'PRINTED' },
  });

  // Check if all files in the order are printed; if so, update order status to PRINTED
  const allOrderFiles = await prisma.orderFile.findMany({
    where: { orderId },
    select: { status: true },
  });
  const allPrinted = allOrderFiles.every((f) => f.status === 'PRINTED');
  if (allPrinted && ['ACCEPTED', 'PROCESSING', 'PRINTING'].includes(file.order.status)) {
    await updateOrderStatus(shopId, userId, orderId, {
      status: 'PRINTED',
      reason: 'All document print jobs completed',
    });
  }

  // Real-time broadcast
  try {
    const { emitToShop } = require('../socket');
    emitToShop(shopId, 'order:printed', {
      orderId,
      fileId,
      attemptNumber: newAttemptNumber,
      isReprint,
    });
  } catch (wsErr) {
    logger.warn(`Failed to broadcast order:printed: ${wsErr.message}`);
  }

  return {
    printJob,
    attemptNumber: newAttemptNumber,
    isReprint,
    warning: isReprint ? `Warning: This document was already printed ${previousAttempts} time(s). Reprint recorded.` : null,
  };
}

// ── Dashboard Overview & Analytics (Real DB data) ──────────

async function getDashboardStats(shopId, userId) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || membership.status !== 'ACTIVE') {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // 7 days ago
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [
    todayOrdersCount,
    todayOrdersList,
    allShopOrders,
    recentOrders,
    statusCounts,
  ] = await Promise.all([
    // Today's orders count
    prisma.order.count({
      where: {
        shopId,
        createdAt: { gte: startOfToday, lte: endOfToday },
      },
    }),
    // Today's orders for revenue & page calculations
    prisma.order.findMany({
      where: {
        shopId,
        createdAt: { gte: startOfToday, lte: endOfToday },
        status: { notIn: ['CANCELLED', 'REJECTED', 'EXPIRED'] },
      },
      include: {
        orderFiles: {
          include: { printConfiguration: true },
        },
      },
    }),
    // Orders over past 7 days for trend charts
    prisma.order.findMany({
      where: {
        shopId,
        createdAt: { gte: sevenDaysAgo },
      },
      include: {
        orderFiles: { include: { printConfiguration: true } },
      },
    }),
    // Recent 5 orders
    prisma.order.findMany({
      where: { shopId },
      include: {
        orderFiles: { select: { id: true, pageCount: true } },
        session: { select: { customerName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    // Status breakdown
    prisma.order.groupBy({
      by: ['status'],
      where: { shopId },
      _count: { id: true },
    }),
  ]);

  // Calculate today's revenue and total pages
  let todayRevenue = 0;
  let totalPagesToday = 0;

  for (const ord of todayOrdersList) {
    todayRevenue += Number(ord.totalAmount);
    for (const file of ord.orderFiles) {
      const pages = file.pageCount || 1;
      const copies = file.printConfiguration?.copies || 1;
      totalPagesToday += (pages * copies);
    }
  }

  // Calculate status counts
  const statusMap = {};
  statusCounts.forEach((s) => {
    statusMap[s.status] = s._count.id;
  });

  const pendingOrders = (statusMap['PENDING'] || 0) + (statusMap['CONFIRMED'] || 0) + (statusMap['PAYMENT_PENDING'] || 0) + (statusMap['ACCEPTED'] || 0) + (statusMap['PROCESSING'] || 0) + (statusMap['PRINTING'] || 0);
  const completedOrders = (statusMap['PRINTED'] || 0) + (statusMap['READY'] || 0) + (statusMap['COLLECTED'] || 0) + (statusMap['COMPLETED'] || 0);
  const cancelledOrders = (statusMap['REJECTED'] || 0) + (statusMap['CANCELLED'] || 0) + (statusMap['EXPIRED'] || 0);

  // Build daily trends for the past 7 days
  const dailyTrends = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });

    const dayOrders = allShopOrders.filter((o) => o.createdAt.toISOString().startsWith(dateStr));
    const dayRevenue = dayOrders
      .filter((o) => !['CANCELLED', 'REJECTED', 'EXPIRED'].includes(o.status))
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const dayPages = dayOrders
      .filter((o) => !['CANCELLED', 'REJECTED', 'EXPIRED'].includes(o.status))
      .reduce((sum, o) => {
        return sum + o.orderFiles.reduce((fsum, f) => fsum + ((f.pageCount || 1) * (f.printConfiguration?.copies || 1)), 0);
      }, 0);

    dailyTrends.push({
      date: dateStr,
      label: dayLabel,
      orders: dayOrders.length,
      revenue: Number(dayRevenue.toFixed(2)),
      pages: dayPages,
    });
  }

  return {
    todayOrders: todayOrdersCount,
    totalPagesToday,
    todayRevenue: Number(todayRevenue.toFixed(2)),
    pendingOrders,
    completedOrders,
    cancelledOrders,
    statusBreakdown: statusMap,
    dailyTrends,
    recentOrders: recentOrders.map((o) => ({
      ...o,
      totalAmount: Number(o.totalAmount),
      filesCount: o.orderFiles.length,
    })),
  };
}

// ── Notifications ─────────────────────────────────────────

async function getShopNotifications(shopId, userId) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || membership.status !== 'ACTIVE') {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.notification.count({
      where: { shopId, isRead: false },
    }),
  ]);

  return {
    notifications,
    unreadCount,
  };
}

async function markNotificationsRead(shopId, userId, notificationId = null) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || membership.status !== 'ACTIVE') {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  if (notificationId) {
    await prisma.notification.updateMany({
      where: { id: notificationId, shopId },
      data: { isRead: true, readAt: new Date() },
    });
  } else {
    await prisma.notification.updateMany({
      where: { shopId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  return { success: true };
}

module.exports = {
  createShop,
  getShop,
  listMyShops,
  updateShop,
  updateShopSettings,
  getShopQR,
  regenerateShopCode,
  getShopPricingRules,
  upsertPricingRules,
  getShopServices,
  createShopService,
  deleteShopService,
  getShopOrders,
  getOrderDetails,
  updateOrderStatus,
  recordPrintJob,
  getDashboardStats,
  getShopNotifications,
  markNotificationsRead,
  VALID_TRANSITIONS,
  isValidTransition,
};
