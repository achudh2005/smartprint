// ============================================================
// Shop Routes
// ============================================================
const express = require('express');
const multer = require('multer');
const os = require('os');
const path = require('path');
const shopController = require('../controllers/shop.controller');
const printerController = require('../controllers/printer.controller');
const analyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireShopMembership, requireShopOwnerOrManager } = require('../middleware/auth.middleware');

const upload = multer({
  dest: path.join(os.tmpdir(), 'smartprint_logos'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const router = express.Router();

// All shop routes require authentication
router.use(authenticate);

// POST /api/v1/shops – Create a new shop
router.post('/',
  shopController.createShopValidation,
  shopController.createShop
);

// GET /api/v1/shops – List all shops the current user belongs to
router.get('/', shopController.listMyShops);

// GET /api/v1/shops/:shopId – Get a specific shop
router.get('/:shopId',
  requireShopMembership,
  shopController.getShop
);

// PUT /api/v1/shops/:shopId – Update shop details
router.put('/:shopId',
  requireShopMembership,
  requireShopOwnerOrManager,
  shopController.updateShopValidation,
  shopController.updateShop
);

// PATCH /api/v1/shops/:shopId – Update shop details (alias)
router.patch('/:shopId',
  requireShopMembership,
  requireShopOwnerOrManager,
  shopController.updateShopValidation,
  shopController.updateShop
);

// PATCH /api/v1/shops/:shopId/settings – Update shop settings
router.patch('/:shopId/settings',
  requireShopMembership,
  requireShopOwnerOrManager,
  shopController.updateSettingsValidation,
  shopController.updateSettings
);

// QR Code endpoints
router.get('/:shopId/qr',
  requireShopMembership,
  shopController.getShopQR
);

router.post('/:shopId/qr/regenerate',
  requireShopMembership,
  shopController.regenerateShopQR
);

// Pricing rules endpoints
router.get('/:shopId/pricing-rules',
  requireShopMembership,
  shopController.getPricingRules
);

router.put('/:shopId/pricing-rules',
  requireShopMembership,
  requireShopOwnerOrManager,
  shopController.setPricingRules
);

// Additional services endpoints
router.get('/:shopId/services',
  requireShopMembership,
  shopController.getServices
);

router.post('/:shopId/services',
  requireShopMembership,
  requireShopOwnerOrManager,
  shopController.createService
);

router.delete('/:shopId/services/:serviceId',
  requireShopMembership,
  requireShopOwnerOrManager,
  shopController.deleteService
);

// Orders endpoints
router.get('/:shopId/orders',
  requireShopMembership,
  shopController.getOrders
);

router.get('/:shopId/orders/:orderId',
  requireShopMembership,
  shopController.getOrderDetails
);

router.patch('/:shopId/orders/:orderId/status',
  requireShopMembership,
  shopController.updateOrderStatus
);

// Manual Printing endpoint (record print attempt)
router.post('/:shopId/orders/:orderId/files/:fileId/print-job',
  requireShopMembership,
  shopController.recordPrintJob
);

// Secure Document Preview & Download
router.get('/:shopId/files/:filePublicId/preview',
  requireShopMembership,
  shopController.previewFile
);

router.get('/:shopId/files/:filePublicId/download',
  requireShopMembership,
  shopController.downloadFile
);

// Dashboard Overview Analytics (Real DB data)
router.get('/:shopId/dashboard/stats',
  requireShopMembership,
  shopController.getDashboardStats
);

// Notifications endpoints
router.get('/:shopId/notifications',
  requireShopMembership,
  shopController.getNotifications
);

router.patch('/:shopId/notifications/read',
  requireShopMembership,
  shopController.markNotificationsRead
);

// Shop Logo Upload
router.post('/:shopId/logo',
  requireShopMembership,
  requireShopOwnerOrManager,
  upload.single('logo'),
  shopController.uploadLogo
);

// Expiry Management Endpoints (Phase 4)
router.post('/:shopId/orders/:orderId/expiry/extend',
  requireShopMembership,
  shopController.extendExpiry
);

router.post('/:shopId/orders/:orderId/expiry/shorten',
  requireShopMembership,
  shopController.shortenExpiry
);

router.delete('/:shopId/orders/:orderId/files/purge',
  requireShopMembership,
  requireShopOwnerOrManager,
  shopController.purgeOrderFiles
);

router.get('/:shopId/orders/:orderId/expiry-logs',
  requireShopMembership,
  shopController.getOrderExpiryLogs
);

// Payment Management Endpoints (Phase 4)
router.post('/:shopId/orders/:orderId/counter-payment',
  requireShopMembership,
  shopController.recordCounterPayment
);

router.get('/:shopId/payments',
  requireShopMembership,
  shopController.getShopPayments
);

// Printer & Direct Printing Management (Phase 5)
router.get('/:shopId/printers',
  requireShopMembership,
  printerController.getShopPrinters
);

router.post('/:shopId/printers',
  requireShopMembership,
  requireShopOwnerOrManager,
  printerController.createPrinter
);

router.patch('/:shopId/printers/:printerId',
  requireShopMembership,
  requireShopOwnerOrManager,
  printerController.updatePrinter
);

router.post('/:shopId/agent-token',
  requireShopMembership,
  requireShopOwnerOrManager,
  printerController.generateAgentToken
);

router.post('/:shopId/orders/:orderId/print-direct',
  requireShopMembership,
  printerController.dispatchDirectPrint
);

router.get('/:shopId/print-jobs',
  requireShopMembership,
  printerController.getPrintJobs
);

router.post('/:shopId/print-jobs/:jobId/retry',
  requireShopMembership,
  printerController.retryPrintJob
);

// Reports & Business Analytics (Phase 5)
router.get('/:shopId/analytics',
  requireShopMembership,
  analyticsController.getAnalytics
);

router.get('/:shopId/analytics/export/csv',
  requireShopMembership,
  analyticsController.exportCsv
);

module.exports = router;
