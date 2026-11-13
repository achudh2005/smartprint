// ============================================================
// Shop Controller
// ============================================================
const path = require('path');
const { body, param } = require('express-validator');
const { prisma } = require('../database/client');
const shopService = require('../services/shop.service');
const reportService = require('../services/report.service');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');
const { validate } = require('../middleware/validate');

// ── Validation Chains ─────────────────────────────────────

const createShopValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Shop name is required.')
    .isLength({ min: 2, max: 255 }).withMessage('Shop name must be between 2 and 255 characters.'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Address must not exceed 1000 characters.'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[+\d\s\-().]{7,20}$/).withMessage('Please enter a valid phone number.'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please enter a valid shop email address.')
    .normalizeEmail(),
  validate,
];

const updateShopValidation = [
  param('shopId').isInt({ min: 1 }).withMessage('Invalid shop ID.'),
  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 255 }).withMessage('Shop name must be between 2 and 255 characters.'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[+\d\s\-().]{7,20}$/).withMessage('Please enter a valid phone number.'),
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail().withMessage('Please enter a valid email address.'),
  validate,
];

const updateSettingsValidation = [
  param('shopId').isInt({ min: 1 }).withMessage('Invalid shop ID.'),
  body('defaultExpiryHours')
    .optional()
    .isInt({ min: 1, max: 8760 }).withMessage('Expiry must be between 1 and 8760 hours.'),
  body('maxUploadSizeMb')
    .optional()
    .isInt({ min: 1, max: 500 }).withMessage('Max upload size must be between 1 and 500 MB.'),
  validate,
];

// ── Handlers ──────────────────────────────────────────────

const createShop = async (req, res, next) => {
  try {
    const { name, address, phone, email, logoUrl } = req.body;
    const shop = await shopService.createShop({ name, address, phone, email, logoUrl }, req.user.id);
    return sendCreated(res, { shop }, 'Shop created successfully.');
  } catch (error) {
    next(error);
  }
};

const listMyShops = async (req, res, next) => {
  try {
    const shops = await shopService.listMyShops(req.user.id);
    return sendSuccess(res, { shops }, 'Shops retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

const getShop = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const shop = await shopService.getShop(shopId, req.user.id);
    if (!shop) return sendError(res, 'Shop not found.', 404);
    return sendSuccess(res, { shop }, 'Shop retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

const updateShop = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const shop = await shopService.updateShop(shopId, req.user.id, req.body);
    return sendSuccess(res, { shop }, 'Shop updated successfully.');
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const settings = await shopService.updateShopSettings(shopId, req.user.id, req.body);
    return sendSuccess(res, { settings }, 'Shop settings updated successfully.');
  } catch (error) {
    next(error);
  }
};

function resolveBaseUrl(req) {
  // 1. Explicit query or origin from frontend
  if (req.query?.origin && /^https?:\/\//i.test(req.query.origin)) {
    return req.query.origin.replace(/\/$/, '');
  }
  if (req.headers?.origin && /^https?:\/\//i.test(req.headers.origin)) {
    return req.headers.origin.replace(/\/$/, '');
  }
  // 2. Referer header (e.g. https://smartprint-ziq4.onrender.com/shops/20/qr)
  if (req.headers?.referer) {
    try {
      const parsed = new URL(req.headers.referer);
      if (parsed.origin && !parsed.origin.includes('localhost') && !parsed.origin.includes('127.0.0.1')) {
        return parsed.origin;
      }
    } catch (_) {}
  }
  // 3. Environment variable if set and not localhost
  if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes('localhost') && !process.env.FRONTEND_URL.includes('127.0.0.1')) {
    return process.env.FRONTEND_URL.replace(/\/$/, '');
  }
  // 4. Host header from reverse proxy (e.g. Render, Railway, Nginx)
  const host = req.get('x-forwarded-host') || req.get('host');
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    return `${proto}://${host}`;
  }
  // 5. Fallback to process.env.FRONTEND_URL or local dev
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

const getShopQR = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const baseUrl = resolveBaseUrl(req);
    const qrData = await shopService.getShopQR(shopId, req.user.id, baseUrl);
    return sendSuccess(res, qrData);
  } catch (error) {
    next(error);
  }
};

const regenerateShopQR = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const baseUrl = resolveBaseUrl(req);
    const result = await shopService.regenerateShopCode(shopId, req.user.id, baseUrl);
    return sendSuccess(res, result, 'Shop code and QR regenerated successfully.');
  } catch (error) {
    next(error);
  }
};

const getPricingRules = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const rules = await shopService.getShopPricingRules(shopId, req.user.id);
    return sendSuccess(res, { rules });
  } catch (error) {
    next(error);
  }
};

const setPricingRules = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const { rules } = req.body;
    if (!Array.isArray(rules)) {
      return sendError(res, 'Rules array is required.', 400);
    }
    const saved = await shopService.upsertPricingRules(shopId, req.user.id, rules);
    return sendSuccess(res, { rules: saved }, 'Pricing rules updated successfully.');
  } catch (error) {
    next(error);
  }
};

const getServices = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const services = await shopService.getShopServices(shopId, req.user.id);
    return sendSuccess(res, { services });
  } catch (error) {
    next(error);
  }
};

const createService = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const service = await shopService.createShopService(shopId, req.user.id, req.body);
    return sendCreated(res, { service }, 'Service created successfully.');
  } catch (error) {
    next(error);
  }
};

const deleteService = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const serviceId = parseInt(req.params.serviceId, 10);
    await shopService.deleteShopService(shopId, req.user.id, serviceId);
    return sendSuccess(res, null, 'Service removed.');
  } catch (error) {
    next(error);
  }
};

const getOrders = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const data = await shopService.getShopOrders(shopId, req.user.id, req.query);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const orderId = parseInt(req.params.orderId, 10);
    const updated = await shopService.updateOrderStatus(shopId, req.user.id, orderId, req.body);
    return sendSuccess(res, { order: updated }, 'Order status updated.');
  } catch (error) {
    next(error);
  }
};

const getOrderDetails = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const orderId = parseInt(req.params.orderId, 10);
    const order = await shopService.getOrderDetails(shopId, req.user.id, orderId);
    return sendSuccess(res, { order });
  } catch (error) {
    next(error);
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const stats = await shopService.getDashboardStats(shopId, req.user.id);
    return sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
};

const recordPrintJob = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const orderId = parseInt(req.params.orderId, 10);
    const fileId = parseInt(req.params.fileId, 10);
    const result = await shopService.recordPrintJob(shopId, req.user.id, orderId, fileId);
    return sendSuccess(res, result, 'Print job recorded.');
  } catch (error) {
    next(error);
  }
};

const downloadFile = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const { filePublicId } = req.params;

    const file = await prisma.orderFile.findFirst({
      where: {
        OR: [
          { publicId: filePublicId },
          { id: !isNaN(Number(filePublicId)) ? Number(filePublicId) : -1 },
        ],
      },
      include: { order: true, fileEncryption: true },
    });

    if (!file || file.order.shopId !== shopId) {
      return sendError(res, 'File not found.', 404);
    }

    // Privacy & Expiry Check: reject download if document has expired or been purged
    const { assertDocumentNotExpired } = require('../services/expiry.service');
    assertDocumentNotExpired(file);

    if (!file.allowDownload) {
      return sendError(res, 'Download not permitted for this file.', 403);
    }

    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    const storageService = require('../services/storage.service');
    const stream = await storageService.getFileStream(file.storagePath, file.fileEncryption);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

const previewFile = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const { filePublicId } = req.params;

    const file = await prisma.orderFile.findFirst({
      where: {
        OR: [
          { publicId: filePublicId },
          { id: !isNaN(Number(filePublicId)) ? Number(filePublicId) : -1 },
        ],
      },
      include: { order: true, fileEncryption: true },
    });

    if (!file || file.order.shopId !== shopId) {
      return sendError(res, 'File not found.', 404);
    }

    const { assertDocumentNotExpired } = require('../services/expiry.service');
    assertDocumentNotExpired(file);

    res.setHeader('Content-Type', file.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    const storageService = require('../services/storage.service');
    const stream = await storageService.getFileStream(file.storagePath, file.fileEncryption);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const data = await shopService.getShopNotifications(shopId, req.user.id);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

const markNotificationsRead = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const notificationId = req.body?.notificationId ? parseInt(req.body.notificationId, 10) : null;
    await shopService.markNotificationsRead(shopId, req.user.id, notificationId);
    return sendSuccess(res, { success: true }, 'Notifications updated.');
  } catch (error) {
    next(error);
  }
};

const uploadLogo = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    if (!req.file) {
      return sendError(res, 'No logo image was uploaded.', 400);
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
    if (!allowed.includes(ext)) {
      return sendError(res, 'Logo must be an image (PNG, JPG, WEBP, SVG).', 400);
    }

    // Logo URL (base64 or static path)
    const fs = require('fs');
    const imageBase64 = fs.readFileSync(req.file.path).toString('base64');
    const mime = req.file.mimetype || 'image/png';
    const logoUrl = `data:${mime};base64,${imageBase64}`;

    const updated = await shopService.updateShop(shopId, req.user.id, { logoUrl });
    // Clean up temp file
    fs.unlink(req.file.path, () => {});

    return sendSuccess(res, { shop: updated, logoUrl }, 'Shop logo updated successfully.');
  } catch (error) {
    next(error);
  }
};

const extendExpiry = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const orderId = parseInt(req.params.orderId, 10);
    const additionalMinutes = parseInt(req.body?.additionalMinutes, 10) || 60;

    const expiryService = require('../services/expiry.service');
    const result = await expiryService.extendOrderExpiry(shopId, req.user.id, orderId, additionalMinutes);
    return sendSuccess(res, result, `Order expiry extended by +${additionalMinutes} minutes.`);
  } catch (error) {
    next(error);
  }
};

const shortenExpiry = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const orderId = parseInt(req.params.orderId, 10);
    const minutesFromNow = parseInt(req.body?.minutesFromNow, 10) || 15;

    const expiryService = require('../services/expiry.service');
    const result = await expiryService.shortenOrderExpiry(shopId, req.user.id, orderId, minutesFromNow);
    return sendSuccess(res, result, `Order expiry shortened to ${minutesFromNow} minutes from now.`);
  } catch (error) {
    next(error);
  }
};

const purgeOrderFiles = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const orderId = parseInt(req.params.orderId, 10);

    const expiryService = require('../services/expiry.service');
    const result = await expiryService.purgeOrderFilesImmediately(shopId, req.user.id, orderId);
    return sendSuccess(res, result, 'Order documents have been securely purged and unlinked from storage.');
  } catch (error) {
    next(error);
  }
};

const getOrderExpiryLogs = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const orderId = parseInt(req.params.orderId, 10);

    const expiryService = require('../services/expiry.service');
    const logs = await expiryService.getOrderExpiryLogs(shopId, req.user.id, orderId);
    return sendSuccess(res, { logs });
  } catch (error) {
    next(error);
  }
};

const recordCounterPayment = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const orderId = parseInt(req.params.orderId, 10);
    const { amount, notes, method } = req.body;

    const paymentService = require('../services/payment.service');
    const payment = await paymentService.recordCounterPayment(shopId, req.user.id, orderId, {
      amount,
      notes,
      method,
    });
    return sendSuccess(res, { payment }, 'Counter payment recorded successfully.');
  } catch (error) {
    next(error);
  }
};

const getShopPayments = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const { page, limit, status, method, startDate, endDate } = req.query;

    const paymentService = require('../services/payment.service');
    const data = await paymentService.getShopPayments(shopId, req.user.id, {
      page,
      limit,
      status,
      method,
      startDate,
      endDate,
    });
    return sendSuccess(res, data, 'Shop payments loaded.');
  } catch (error) {
    next(error);
  }
};

const sendReportNow = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const { period = 'weekly' } = req.body;
    if (!['weekly', 'monthly'].includes((period || '').toLowerCase())) {
      return sendError(res, 'period must be "weekly" or "monthly"', 400);
    }
    const result = await reportService.sendReportForSingleShop(shopId, period);
    return sendSuccess(res, result, `${result.period} finance report generated and sent successfully.`);
  } catch (error) {
    next(error);
  }
};


const uploadEditedFile = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const orderId = parseInt(req.params.orderId, 10);
    const { fileId } = req.params;

    if (!req.file) {
      return sendError(res, 'No edited file uploaded.', 400);
    }

    const result = await shopService.saveEditedOrderFile(
      shopId,
      req.user.id,
      orderId,
      fileId,
      req.file,
      {
        directPrint: req.body.directPrint === 'true' || req.body.directPrint === true,
        printerId: req.body.printerId ? parseInt(req.body.printerId, 10) : undefined,
        pageCount: req.body.pageCount ? parseInt(req.body.pageCount, 10) : 1,
      }
    );

    return sendSuccess(res, result, 'Edited file saved and attached to order.', 201);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadEditedFile,
  createShopValidation,
  updateShopValidation,
  updateSettingsValidation,
  createShop,
  listMyShops,
  getShop,
  updateShop,
  updateSettings,
  getShopQR,
  regenerateShopQR,
  getPricingRules,
  setPricingRules,
  getServices,
  createService,
  deleteService,
  getOrders,
  getOrderDetails,
  updateOrderStatus,
  getDashboardStats,
  recordPrintJob,
  downloadFile,
  previewFile,
  getNotifications,
  markNotificationsRead,
  uploadLogo,
  extendExpiry,
  shortenExpiry,
  purgeOrderFiles,
  getOrderExpiryLogs,
  recordCounterPayment,
  getShopPayments,
  sendReportNow,
};
