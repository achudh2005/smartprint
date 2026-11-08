/**
 * Printer Service
 * Manages shop printers, agent synchronization, direct print job dispatch,
 * and print lifecycle progression.
 */
const crypto = require('crypto');
const { prisma } = require('../database/client');
const logger = require('../utils/logger');
const { emitToShop } = require('../socket');
const { assertDocumentNotExpired } = require('./expiry.service');

/**
 * Generate or regenerate Print Agent token for a shop
 */
async function generateShopAgentToken(shopId, userId) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || !['OWNER', 'MANAGER'].includes(membership.role)) {
    const err = new Error('Access denied. Only Owners and Managers can manage Agent credentials.');
    err.statusCode = 403;
    throw err;
  }

  const agentToken = `spa_${crypto.randomBytes(24).toString('hex')}`;
  const updatedShop = await prisma.shop.update({
    where: { id: shopId },
    data: { agentToken },
  });

  logger.info(`[PrintAgent] Generated new Agent Token for Shop #${shopId} (${updatedShop.shopCode}) by user ${userId}`);
  return { agentToken, shopCode: updatedShop.shopCode };
}

/**
 * Authenticate Print Agent with shopCode and agentToken
 */
async function authenticateAgent(shopCode, agentToken) {
  if (!shopCode || !agentToken) {
    const err = new Error('Missing shop code or agent token.');
    err.statusCode = 400;
    throw err;
  }

  const shop = await prisma.shop.findFirst({
    where: {
      shopCode: shopCode.toUpperCase().trim(),
      agentToken: agentToken.trim(),
      status: 'ACTIVE',
    },
    include: { shopSettings: true },
  });

  if (!shop) {
    const err = new Error('Invalid agent token or shop code. Authentication failed.');
    err.statusCode = 401;
    throw err;
  }

  return {
    shopId: shop.id,
    shopCode: shop.shopCode,
    shopName: shop.name,
    authenticated: true,
  };
}

/**
 * Synchronize discovered printers from Print Agent
 */
async function syncAgentPrinters(shopId, discoveredPrinters = []) {
  const syncedPrinters = [];
  const now = new Date();

  for (const p of discoveredPrinters) {
    const printerName = p.name?.trim();
    if (!printerName) continue;

    const existing = await prisma.printer.findFirst({
      where: { shopId, name: printerName },
    });

    if (existing) {
      const updated = await prisma.printer.update({
        where: { id: existing.id },
        data: {
          status: 'ONLINE',
          model: p.model || existing.model,
          ipAddress: p.ipAddress || existing.ipAddress,
          connectionType: p.connectionType || existing.connectionType || 'WINDOWS_SPOOLER',
          capabilities: p.capabilities || existing.capabilities,
          lastSeenAt: now,
        },
      });
      syncedPrinters.push(updated);
    } else {
      // Create new discovered printer
      const isFirst = (await prisma.printer.count({ where: { shopId } })) === 0;
      const caps = p.capabilities || {
        color: p.isColor !== undefined ? Boolean(p.isColor) : true,
        duplex: p.isDuplex !== undefined ? Boolean(p.isDuplex) : false,
        paperSizes: p.supportedPaperSizes || ['A4', 'LETTER'],
      };
      const created = await prisma.printer.create({
        data: {
          shopId,
          name: printerName,
          model: p.model || 'Generic Windows Printer',
          status: 'ONLINE',
          connectionType: p.connectionType || 'WINDOWS_SPOOLER',
          capabilities: caps,
          isDefault: p.isDefault !== undefined ? p.isDefault : isFirst,
          isActive: true,
          lastSeenAt: now,
        },
      });
      syncedPrinters.push(created);
    }
  }

  // Broadcast printer status change to dashboard
  emitToShop(shopId, 'printers:synced', {
    shopId,
    printersCount: syncedPrinters.length,
    timestamp: now,
  });

  return syncedPrinters;
}

/**
 * List all printers configured for a shop
 */
async function getShopPrinters(shopId, userId) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || membership.status !== 'ACTIVE') {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  const printers = await prisma.printer.findMany({
    where: { shopId },
    include: {
      _count: {
        select: { printJobs: true },
      },
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { agentToken: true, shopCode: true },
  });

  return {
    printers,
    hasAgentToken: Boolean(shop?.agentToken),
    shopCode: shop?.shopCode,
  };
}

/**
 * Register a printer manually
 */
async function createPrinter(shopId, userId, printerData) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || !['OWNER', 'MANAGER'].includes(membership.role)) {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  const { name, model, ipAddress, connectionType, isDefault } = printerData;
  if (!name || !name.trim()) {
    const err = new Error('Printer name is required.');
    err.statusCode = 400;
    throw err;
  }

  // If set to default, unset other defaults
  if (isDefault) {
    await prisma.printer.updateMany({
      where: { shopId },
      data: { isDefault: false },
    });
  }

  return prisma.printer.create({
    data: {
      shopId,
      name: name.trim(),
      model: model?.trim() || null,
      ipAddress: ipAddress?.trim() || null,
      connectionType: connectionType?.trim() || 'MANUAL',
      status: 'OFFLINE',
      isDefault: Boolean(isDefault),
      isActive: true,
    },
  });
}

/**
 * Update printer settings
 */
async function updatePrinter(shopId, userId, printerId, updateData) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || !['OWNER', 'MANAGER'].includes(membership.role)) {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  const printer = await prisma.printer.findFirst({
    where: { id: printerId, shopId },
  });
  if (!printer) {
    const err = new Error('Printer not found.');
    err.statusCode = 404;
    throw err;
  }

  if (updateData.isDefault) {
    await prisma.printer.updateMany({
      where: { shopId },
      data: { isDefault: false },
    });
  }

  return prisma.printer.update({
    where: { id: printerId },
    data: {
      ...(updateData.name && { name: updateData.name.trim() }),
      ...(updateData.model !== undefined && { model: updateData.model }),
      ...(updateData.isActive !== undefined && { isActive: Boolean(updateData.isActive) }),
      ...(updateData.isDefault !== undefined && { isDefault: Boolean(updateData.isDefault) }),
      ...(updateData.status && { status: updateData.status }),
    },
  });
}

/**
 * Dispatch an order or specific file for Direct Printing
 */
async function dispatchDirectPrint(shopId, userId, { orderId, fileId, printerId, idempotencyKey: customKey }) {
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
        },
      },
    },
  });

  if (!order) {
    const err = new Error('Order not found.');
    err.statusCode = 404;
    throw err;
  }

  // Resolve target printer: provided printer or shop default
  let targetPrinter = null;
  if (printerId) {
    targetPrinter = await prisma.printer.findFirst({
      where: { id: printerId, shopId, isActive: true },
    });
  } else {
    targetPrinter = await prisma.printer.findFirst({
      where: { shopId, isDefault: true, isActive: true },
    });
  }

  if (!targetPrinter) {
    const err = new Error('No active printer available. Please select or configure a default printer.');
    err.statusCode = 400;
    throw err;
  }

  const filesToPrint = fileId
    ? order.orderFiles.filter((f) => f.id === fileId)
    : order.orderFiles;

  if (filesToPrint.length === 0) {
    const err = new Error('No files to print.');
    err.statusCode = 400;
    throw err;
  }

  const createdJobs = [];

  for (const file of filesToPrint) {
    // Gatekeeper: ensure file has not expired
    assertDocumentNotExpired(file);

    const idempotencyKey =
      filesToPrint.length === 1 && customKey
        ? customKey
        : `job_${order.id}_${file.id}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    if (customKey) {
      const existing = await prisma.printJob.findUnique({ where: { idempotencyKey } });
      if (existing) {
        createdJobs.push(existing);
        continue;
      }
    }

    const config = file.printConfiguration || {};
    const jobTicket = {
      orderNumber: order.orderNumber,
      fileName: file.originalName,
      copies: config.copies || 1,
      colorMode: config.colorMode || 'BLACK_WHITE',
      paperSize: config.paperSize || 'A4',
      duplexMode: config.duplexMode || 'SIMPLEX',
      pageRange: config.pageRange || 'ALL',
      totalFilePages: file.pageCount || 1,
    };

    const previousAttempts = await prisma.printJob.count({ where: { fileId: file.id } });

    const job = await prisma.printJob.create({
      data: {
        fileId: file.id,
        printerId: targetPrinter.id,
        status: 'QUEUED',
        attemptNumber: previousAttempts + 1,
        idempotencyKey,
        jobTicket,
        startedAt: new Date(),
      },
    });

    createdJobs.push(job);
  }

  // Update order status to PRINTING if not already PRINTING
  if (order.status !== 'PRINTING') {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'PRINTING' },
    });
    await prisma.orderStatusLog.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: 'PRINTING',
        note: `Dispatched direct print job to printer "${targetPrinter.name}"`,
        changedBy: userId,
      },
    });
  }

  // Broadcast WebSocket event to Agent and Dashboard
  emitToShop(shopId, 'print_jobs:new', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    printerId: targetPrinter.id,
    printerName: targetPrinter.name,
    jobsCount: createdJobs.length,
    jobs: createdJobs,
  });

  return {
    success: true,
    printer: { id: targetPrinter.id, name: targetPrinter.name },
    jobs: createdJobs,
  };
}

/**
 * Agent Polling: Fetch pending QUEUED print jobs for this shop
 */
async function getAgentPendingJobs(shopId) {
  const jobs = await prisma.printJob.findMany({
    where: {
      status: 'QUEUED',
      file: { order: { shopId } },
      printer: { isActive: true },
    },
    include: {
      file: {
        select: {
          id: true,
          publicId: true,
          originalName: true,
          mimeType: true,
          pageCount: true,
          expiresAt: true,
          isPurged: true,
          status: true,
        },
      },
      printer: {
        select: { id: true, name: true, model: true },
      },
    },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  return jobs.map((job) => ({
    id: job.id,
    publicId: job.publicId,
    fileId: job.fileId,
    filePublicId: job.file.publicId,
    fileName: job.file.originalName,
    printerName: job.printer?.name,
    attemptNumber: job.attemptNumber,
    jobTicket: job.jobTicket,
    downloadUrl: `/api/v1/agent/jobs/${job.id}/download`,
    createdAt: job.createdAt,
  }));
}

/**
 * Agent Status Updates (Lifecycle progression)
 * QUEUED -> DOWNLOADED -> SUBMITTED_TO_OS -> DRIVER_COMPLETED | FAILED
 */
async function updateAgentJobStatus(shopId, jobId, statusOrPayload, extraPayload = {}) {
  const payload =
    typeof statusOrPayload === 'string'
      ? { status: statusOrPayload, ...extraPayload }
      : statusOrPayload || {};

  const { status, errorMessage, agentNotes, error } = payload;
  const finalError = errorMessage || error;

  const job = await prisma.printJob.findFirst({
    where: {
      id: jobId,
      file: { order: { shopId } },
    },
    include: {
      file: { include: { order: true } },
      printer: true,
    },
  });

  if (!job) {
    const err = new Error('Print job not found for this shop.');
    err.statusCode = 404;
    throw err;
  }

  const updateData = {
    status,
    ...(agentNotes && { agentNotes }),
    ...(finalError && { errorMessage: finalError }),
    updatedAt: new Date(),
  };

  if (status === 'DRIVER_COMPLETED' || status === 'COMPLETED' || status === 'MANUALLY_CONFIRMED') {
    updateData.completedAt = new Date();
    // Update file status to PRINTED
    await prisma.orderFile.update({
      where: { id: job.fileId },
      data: { status: 'PRINTED' },
    });
  }

  const updatedJob = await prisma.printJob.update({
    where: { id: jobId },
    data: updateData,
  });

  // Check if all files in the order are printed
  if (['DRIVER_COMPLETED', 'COMPLETED', 'MANUALLY_CONFIRMED'].includes(status)) {
    const orderFiles = await prisma.orderFile.findMany({
      where: { orderId: job.file.orderId },
    });
    const allFilesPrinted = orderFiles.every((f) => f.status === 'PRINTED');
    if (allFilesPrinted && job.file?.order && job.file.order.status !== 'PRINTED') {
      await prisma.order.update({
        where: { id: job.file.orderId },
        data: { status: 'PRINTED' },
      });
      await prisma.orderStatusLog.create({
        data: {
          orderId: job.file.orderId,
          fromStatus: job.file.order.status,
          toStatus: 'PRINTED',
          note: `All documents printed via Windows Print Agent (${job.printer?.name})`,
        },
      });
      emitToShop(shopId, 'order:status_changed', {
        orderId: job.file.orderId,
        orderNumber: job.file.order.orderNumber,
        fromStatus: job.file.order.status,
        toStatus: 'PRINTED',
      });
    }
  }

  // Real-time broadcast
  emitToShop(shopId, 'print_job:status_updated', {
    jobId: job.id,
    orderId: job.file.orderId,
    status,
    printerName: job.printer?.name,
    errorMessage,
    timestamp: new Date(),
  });

  return updatedJob;
}

/**
 * View print jobs history for shop
 */
async function getShopPrintJobs(shopId, userId, { page = 1, limit = 20, status, printerId } = {}) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || membership.status !== 'ACTIVE') {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  const where = {
    file: { order: { shopId } },
    ...(status && status !== 'ALL' && { status }),
    ...(printerId && { printerId: parseInt(printerId, 10) }),
  };

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [jobs, total] = await Promise.all([
    prisma.printJob.findMany({
      where,
      include: {
        file: {
          select: {
            id: true,
            originalName: true,
            status: true,
            order: { select: { id: true, orderNumber: true } },
          },
        },
        printer: {
          select: { id: true, name: true, model: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
      skip: offset,
    }),
    prisma.printJob.count({ where }),
  ]);

  return {
    jobs,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)) || 1,
    },
  };
}

/**
 * Retry a failed print job
 */
async function retryPrintJob(shopId, userId, jobId) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || membership.status !== 'ACTIVE') {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  const job = await prisma.printJob.findFirst({
    where: { id: jobId, file: { order: { shopId } } },
    include: { file: true },
  });

  if (!job) {
    const err = new Error('Print job not found.');
    err.statusCode = 404;
    throw err;
  }

  assertDocumentNotExpired(job.file);

  const newJob = await prisma.printJob.create({
    data: {
      fileId: job.fileId,
      printerId: job.printerId,
      status: 'QUEUED',
      attemptNumber: job.attemptNumber + 1,
      jobTicket: job.jobTicket,
      idempotencyKey: `retry_${job.id}_${Date.now()}`,
    },
  });

  emitToShop(shopId, 'print_jobs:new', {
    orderId: job.file.orderId,
    printerId: job.printerId,
    jobsCount: 1,
    jobs: [newJob],
  });

  return newJob;
}

module.exports = {
  generateShopAgentToken,
  authenticateAgent,
  syncAgentPrinters,
  getShopPrinters,
  createPrinter,
  updatePrinter,
  dispatchDirectPrint,
  getAgentPendingJobs,
  updateAgentJobStatus,
  getShopPrintJobs,
  retryPrintJob,
};
