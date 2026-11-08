/**
 * Expiry Service
 * Handles customer file lifecycle, automatic deletion, owner expiry controls,
 * and data privacy enforcement.
 */
const fs = require('fs');
const path = require('path');
const { prisma } = require('../database/client');
const logger = require('../utils/logger');
const { emitToShop } = require('../socket');

const EXPIRY_DURATIONS_MS = {
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '3h': 3 * 60 * 60 * 1000,
  '8h': 8 * 60 * 60 * 1000,
};

/**
 * Convert string option (e.g. '15m', '1h', '3h', '8h') to milliseconds
 */
function parseExpiryDuration(option, fallback = '1h') {
  return EXPIRY_DURATIONS_MS[option] || EXPIRY_DURATIONS_MS[fallback] || EXPIRY_DURATIONS_MS['1h'];
}

/**
 * Calculate expiry Date from an option string
 */
function calculateExpiresAt(option = '1h', fromDate = new Date()) {
  const durationMs = parseExpiryDuration(option);
  return new Date(fromDate.getTime() + durationMs);
}

/**
 * Physically remove file and potential previews from disk safely
 */
function securelyDeleteFile(storagePath) {
  if (!storagePath) return { success: false, bytesFreed: 0 };

  try {
    const fullPath = path.isAbsolute(storagePath)
      ? storagePath
      : path.join(process.cwd(), storagePath);

    let bytesFreed = 0;
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      bytesFreed = stats.size;
      fs.unlinkSync(fullPath);
      logger.info(`[Privacy/Expiry] Securely unlinked original file: ${fullPath} (${bytesFreed} bytes)`);
    }

    // Check for associated preview PDF / thumbnail if present
    const ext = path.extname(fullPath);
    const previewPdf = fullPath.replace(ext, '_preview.pdf');
    if (fs.existsSync(previewPdf)) {
      const pStats = fs.statSync(previewPdf);
      bytesFreed += pStats.size;
      fs.unlinkSync(previewPdf);
      logger.info(`[Privacy/Expiry] Unlinked generated preview: ${previewPdf}`);
    }

    return { success: true, bytesFreed };
  } catch (err) {
    logger.error(`[Privacy/Expiry] Error deleting file on disk (${storagePath}): ${err.message}`);
    return { success: false, bytesFreed: 0, error: err.message };
  }
}

/**
 * Gatekeeper: check if document is expired before allowing preview, download or print
 */
function assertDocumentNotExpired(file) {
  if (!file) {
    const err = new Error('Document not found.');
    err.statusCode = 404;
    throw err;
  }

  const isExpiredByStatus = file.status === 'EXPIRED' || file.isPurged;
  const isExpiredByTime = file.expiresAt && new Date(file.expiresAt) < new Date();

  if (isExpiredByStatus || isExpiredByTime) {
    const err = new Error('Document has expired and been securely purged in accordance with privacy policy.');
    err.statusCode = 410; // 410 Gone
    throw err;
  }
}

/**
 * Core Expiry & Purge Function for an Order's Files
 * Deletes files from storage, records bytes freed, and writes to expiry_logs
 */
async function expireOrderFiles(orderId, { reason = 'Scheduled lifetime expiry', performedBy = null, action = 'AUTO_EXPIRED' } = {}) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderFiles: true,
      shop: true,
    },
  });

  if (!order) {
    logger.warn(`[Expiry] Order ${orderId} not found for expiry processing.`);
    return { success: false, message: 'Order not found' };
  }

  // Guard against old queued jobs: If order expiry was extended into the future, do not purge!
  if (action === 'AUTO_EXPIRED' && order.expiresAt && new Date(order.expiresAt).getTime() > Date.now() + 1000) {
    logger.info(`[Expiry] Order ${order.orderNumber} expiry was extended to ${order.expiresAt.toISOString()}. Skipping premature purge from outdated queued job.`);
    return {
      success: true,
      skipped: true,
      reason: 'Order expiry extended into future',
      currentExpiresAt: order.expiresAt,
    };
  }

  // If order is currently being physically printed, do not interrupt active printing!
  if (order.status === 'PRINTING') {
    logger.info(`[Expiry] Order ${order.orderNumber} is currently PRINTING. Deferring purge until print completes.`);
    return { deferred: true, message: 'Order currently printing' };
  }

  // If all files are already purged, do not re-purge
  if (order.orderFiles.length > 0 && order.orderFiles.every((f) => f.isPurged)) {
    logger.info(`[Expiry] Order ${order.orderNumber} files already purged.`);
    return {
      success: true,
      filesPurged: 0,
      bytesFreed: '0',
      alreadyPurged: true,
    };
  }

  let totalBytesFreed = BigInt(0);
  let filesPurgedCount = 0;

  for (const file of order.orderFiles) {
    if (!file.isPurged) {
      const deleteResult = securelyDeleteFile(file.storagePath);
      totalBytesFreed += BigInt(deleteResult.bytesFreed);

      await prisma.orderFile.update({
        where: { id: file.id },
        data: {
          status: 'EXPIRED',
          isPurged: true,
          deletedAt: new Date(),
        },
      });
      filesPurgedCount++;
    }
  }

  // Update order status to EXPIRED if not already collected or completed
  let newOrderStatus = order.status;
  if (!['COLLECTED', 'COMPLETED', 'REJECTED', 'CANCELLED'].includes(order.status)) {
    newOrderStatus = 'EXPIRED';
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'EXPIRED' },
    });

    await prisma.orderStatusLog.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: 'EXPIRED',
        note: reason,
        changedBy: performedBy,
      },
    });
  }

  // Record in expiry_logs
  const expiryLog = await prisma.expiryLog.create({
    data: {
      orderId,
      sessionId: order.sessionId,
      action,
      previousExpiry: order.expiresAt,
      newExpiry: new Date(),
      expiredAt: new Date(),
      filesCount: filesPurgedCount,
      bytesFreed: totalBytesFreed,
      reason,
      performedBy,
    },
  });

  // Notify Shop via WebSocket
  try {
    emitToShop(order.shopId, 'order:expired', {
      orderId,
      orderNumber: order.orderNumber,
      action,
      filesPurged: filesPurgedCount,
      status: newOrderStatus,
      timestamp: new Date(),
    });
  } catch (wsErr) {
    logger.warn(`Failed to broadcast order:expired: ${wsErr.message}`);
  }

  logger.info(`[Expiry] Order ${order.orderNumber} purged: ${filesPurgedCount} files, ${totalBytesFreed.toString()} bytes freed. Log ID: ${expiryLog.id}`);

  return {
    success: true,
    filesPurged: filesPurgedCount,
    bytesFreed: totalBytesFreed.toString(),
    orderStatus: newOrderStatus,
    expiryLog,
  };
}

/**
 * Owner Action: Extend Order Expiry
 */
async function extendOrderExpiry(shopId, userId, orderId, additionalMinutes = 60) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || !['OWNER', 'MANAGER', 'STAFF'].includes(membership.role)) {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, shopId },
    include: { orderFiles: true },
  });
  if (!order) {
    const err = new Error('Order not found.');
    err.statusCode = 404;
    throw err;
  }

  if (order.status === 'EXPIRED') {
    const err = new Error('Cannot extend expiry for an already expired and purged order.');
    err.statusCode = 400;
    throw err;
  }

  const currentExpiry = order.expiresAt ? new Date(order.expiresAt) : new Date();
  const baseTime = currentExpiry > new Date() ? currentExpiry : new Date();
  const newExpiry = new Date(baseTime.getTime() + additionalMinutes * 60 * 1000);

  // Update Order and File records
  await prisma.order.update({
    where: { id: orderId },
    data: { expiresAt: newExpiry },
  });

  await prisma.orderFile.updateMany({
    where: { orderId, isPurged: false },
    data: { expiresAt: newExpiry },
  });

  // Audit log in expiry_logs
  await prisma.expiryLog.create({
    data: {
      orderId,
      sessionId: order.sessionId,
      action: 'EXTENDED',
      previousExpiry: order.expiresAt,
      newExpiry,
      reason: `Expiry extended by +${additionalMinutes}m by staff user ${userId}`,
      performedBy: userId,
      filesCount: order.orderFiles.length,
    },
  });

  // Reschedule background queue job
  try {
    const { scheduleOrderExpiry } = require('../queues/expiry.queue');
    const delayMs = Math.max(0, newExpiry.getTime() - Date.now());
    await scheduleOrderExpiry(orderId, delayMs);
  } catch (qErr) {
    logger.warn(`Failed to reschedule queue job: ${qErr.message}`);
  }

  // Real-time broadcast
  emitToShop(shopId, 'order:expiry_updated', {
    orderId,
    orderNumber: order.orderNumber,
    newExpiresAt: newExpiry,
    action: 'EXTENDED',
  });

  return { success: true, expiresAt: newExpiry };
}

/**
 * Owner Action: Shorten Order Expiry
 */
async function shortenOrderExpiry(shopId, userId, orderId, minutesFromNow = 15) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || !['OWNER', 'MANAGER', 'STAFF'].includes(membership.role)) {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, shopId },
    include: { orderFiles: true },
  });
  if (!order) {
    const err = new Error('Order not found.');
    err.statusCode = 404;
    throw err;
  }

  const newExpiry = new Date(Date.now() + minutesFromNow * 60 * 1000);

  await prisma.order.update({
    where: { id: orderId },
    data: { expiresAt: newExpiry },
  });

  await prisma.orderFile.updateMany({
    where: { orderId, isPurged: false },
    data: { expiresAt: newExpiry },
  });

  await prisma.expiryLog.create({
    data: {
      orderId,
      sessionId: order.sessionId,
      action: 'SHORTENED',
      previousExpiry: order.expiresAt,
      newExpiry,
      reason: `Expiry shortened to ${minutesFromNow}m from now by staff user ${userId}`,
      performedBy: userId,
      filesCount: order.orderFiles.length,
    },
  });

  try {
    const { scheduleOrderExpiry } = require('../queues/expiry.queue');
    await scheduleOrderExpiry(orderId, minutesFromNow * 60 * 1000);
  } catch (qErr) {
    logger.warn(`Failed to reschedule queue job: ${qErr.message}`);
  }

  emitToShop(shopId, 'order:expiry_updated', {
    orderId,
    orderNumber: order.orderNumber,
    newExpiresAt: newExpiry,
    action: 'SHORTENED',
  });

  return { success: true, expiresAt: newExpiry };
}

/**
 * Owner Action: Immediate Purge / Deletion
 */
async function purgeOrderFilesImmediately(shopId, userId, orderId) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || !['OWNER', 'MANAGER'].includes(membership.role)) {
    const err = new Error('Access denied. Only Owners and Managers can manually purge files.');
    err.statusCode = 403;
    throw err;
  }

  return expireOrderFiles(orderId, {
    reason: `Manual immediate file purge confirmed by user ${userId}`,
    performedBy: userId,
    action: 'IMMEDIATE_DELETION',
  });
}

/**
 * Get Expiry Audit Logs for an Order
 */
async function getOrderExpiryLogs(shopId, userId, orderId) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || membership.status !== 'ACTIVE') {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  const logs = await prisma.expiryLog.findMany({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
  });

  return logs.map((l) => ({
    ...l,
    bytesFreed: l.bytesFreed ? l.bytesFreed.toString() : '0',
  }));
}

module.exports = {
  EXPIRY_DURATIONS_MS,
  parseExpiryDuration,
  calculateExpiresAt,
  securelyDeleteFile,
  assertDocumentNotExpired,
  expireOrderFiles,
  extendOrderExpiry,
  shortenOrderExpiry,
  purgeOrderFilesImmediately,
  getOrderExpiryLogs,
};
