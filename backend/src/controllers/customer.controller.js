const customerService = require('../services/customer.service');
const storageService = require('../services/storage.service');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');
const logger = require('../utils/logger');
const { prisma } = require('../database/client');
const jwt = require('jsonwebtoken');

/**
 * GET /api/v1/customer/shops/:shopCode
 */
async function getShopDetails(req, res, next) {
  try {
    const data = await customerService.getShopByCode(req.params.shopCode);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/customer/sessions
 */
async function initSession(req, res, next) {
  try {
    const { shopCode, existingToken } = req.body;
    if (!shopCode) {
      return sendError(res, 'Shop code is required.', 400);
    }
    const { session, draftOrder, shop } = await customerService.getOrCreateSession(shopCode, existingToken);
    return sendSuccess(res, {
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
      draftOrder: {
        orderNumber: draftOrder.orderNumber,
        totalAmount: Number(draftOrder.totalAmount),
        filesCount: draftOrder.orderFiles?.length || 0,
        files: (draftOrder.orderFiles || []).map((f) => ({
          publicId: f.publicId,
          originalName: f.originalName,
          pageCount: f.pageCount,
          status: f.status,
          fileSizeBytes: f.fileSizeBytes.toString(),
          printConfiguration: f.printConfiguration,
          services: (f.orderFileServices || []).map((ofs) => ({
            additionalServiceId: ofs.additionalServiceId,
            name: ofs.additionalService?.name,
            quantity: ofs.quantity,
            total: Number(ofs.total),
          })),
        })),
      },
      shop: {
        name: shop.name,
        shopCode: shop.shopCode,
        logoUrl: shop.logoUrl,
        currency: shop.shopSettings?.currency || 'INR',
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/customer/sessions/:sessionToken
 */
async function getSessionState(req, res, next) {
  try {
    const { session, draftOrder, shop } = await customerService.validateSession(req.params.sessionToken);
    return sendSuccess(res, {
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
      draftOrder: {
        orderNumber: draftOrder.orderNumber,
        totalAmount: Number(draftOrder.totalAmount),
        filesCount: draftOrder.orderFiles?.length || 0,
        files: (draftOrder.orderFiles || []).map((f) => ({
          publicId: f.publicId,
          originalName: f.originalName,
          pageCount: f.pageCount,
          status: f.status,
          fileSizeBytes: f.fileSizeBytes.toString(),
          printConfiguration: f.printConfiguration,
          services: (f.orderFileServices || []).map((ofs) => ({
            additionalServiceId: ofs.additionalServiceId,
            name: ofs.additionalService?.name,
            quantity: ofs.quantity,
            total: Number(ofs.total),
          })),
        })),
      },
      shop: {
        name: shop.name,
        shopCode: shop.shopCode,
        logoUrl: shop.logoUrl,
        currency: shop.shopSettings?.currency || 'INR',
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/customer/sessions/:sessionToken/files
 */
async function uploadFiles(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      return sendError(res, 'No files were uploaded.', 400);
    }
    const uploaded = await customerService.uploadFiles(req.params.sessionToken, req.files);
    return sendCreated(res, { files: uploaded }, 'Documents uploaded successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/customer/sessions/:sessionToken/files/:filePublicId/config
 */
async function updateFileConfig(req, res, next) {
  try {
    const result = await customerService.updateFileConfiguration(
      req.params.sessionToken,
      req.params.filePublicId,
      req.body
    );
    return sendSuccess(res, result, 'Print configuration updated.');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/customer/sessions/:sessionToken/files/:filePublicId/services
 */
async function addServiceToFile(req, res, next) {
  try {
    const result = await customerService.attachFileService(
      req.params.sessionToken,
      req.params.filePublicId,
      req.body
    );
    return sendSuccess(res, result, 'Service added to file.');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/customer/sessions/:sessionToken/files/:filePublicId/services/:serviceId
 */
async function removeServiceFromFile(req, res, next) {
  try {
    const result = await customerService.removeFileService(
      req.params.sessionToken,
      req.params.filePublicId,
      parseInt(req.params.serviceId, 10)
    );
    return sendSuccess(res, result, 'Service removed from file.');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/customer/sessions/:sessionToken/files/:filePublicId
 */
async function deleteFile(req, res, next) {
  try {
    const result = await customerService.deleteFile(req.params.sessionToken, req.params.filePublicId);
    return sendSuccess(res, result, 'File removed.');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/customer/sessions/:sessionToken/confirm
 */
async function confirmOrder(req, res, next) {
  try {
    const result = await customerService.confirmOrder(req.params.sessionToken, req.body);
    return sendSuccess(res, result, 'Order confirmed successfully!');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/customer/orders/:orderNumber
 */
async function getOrderStatus(req, res, next) {
  try {
    const result = await customerService.getOrderByNumber(req.params.orderNumber);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/customer/files/:filePublicId/preview
 * Streams document for in-browser preview (PDF, images)
 */
async function previewFile(req, res, next) {
  try {
    const { filePublicId } = req.params;
    const { sessionToken, token: queryToken } = req.query;

    const file = await prisma.orderFile.findFirst({
      where: {
        OR: [
          { publicId: filePublicId },
          { id: !isNaN(Number(filePublicId)) ? Number(filePublicId) : -1 },
        ],
      },
      include: {
        order: {
          include: {
            session: true,
          },
        },
      },
    });

    if (!file) {
      return sendError(res, 'File not found.', 404);
    }

    // Privacy & Expiry Check: reject if document has expired or been purged
    const { assertDocumentNotExpired } = require('../services/expiry.service');
    assertDocumentNotExpired(file);

    // Authorization check:
    // 1. Valid customer sessionToken matching this order's session
    let isAuthorized = false;
    if (sessionToken && file.order?.session?.sessionToken === sessionToken) {
      isAuthorized = true;
    }

    // 2. Or shop owner/staff with active membership in this shop
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : queryToken;

    if (!isAuthorized && token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = Number(decoded.sub || decoded.id);
        const membership = await prisma.shopUser.findFirst({
          where: { shopId: file.order.shopId, userId: !isNaN(userId) ? userId : -1 },
        });
        if (membership && (membership.status === 'ACTIVE' || !membership.status)) {
          isAuthorized = true;
        }
      } catch (authErr) {
        // Invalid token
      }
    }

    if (!isAuthorized) {
      return sendError(res, 'Access denied: Valid customer session or shop authorization required.', 403);
    }

    res.setHeader('Content-Type', file.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);

    const stream = storageService.getFileStream(file.storagePath);
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getShopDetails,
  initSession,
  getSessionState,
  uploadFiles,
  updateFileConfig,
  addServiceToFile,
  removeServiceFromFile,
  deleteFile,
  confirmOrder,
  getOrderStatus,
  previewFile,
};
