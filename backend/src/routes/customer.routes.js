const express = require('express');
const multer = require('multer');
const os = require('os');
const path = require('path');
const rateLimit = require('express-rate-limit');
const customerController = require('../controllers/customer.controller');

const router = express.Router();

// Helper to determine if IP is local/private LAN
const isLocalOrLanIp = (ip = '') => {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === 'localhost' ||
    ip.includes('127.0.0.1') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.') ||
    ip.startsWith('::ffff:127.0.0.1') ||
    ip.startsWith('::ffff:192.168.') ||
    ip.startsWith('::ffff:10.')
  );
};

// Rate limiter for customer file uploads (DDoS & disk-fill protection)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // max 60 upload requests per 15 mins per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production' || isLocalOrLanIp(req.ip),
  message: { success: false, message: 'Too many file uploads. Please wait a few minutes before trying again.' },
});

// Rate limiter for session initialization
const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production' || isLocalOrLanIp(req.ip),
  message: { success: false, message: 'Too many requests. Please wait a moment.' },
});

// Multer temporary upload handler
const upload = multer({
  dest: path.join(os.tmpdir(), 'smartprint_uploads'),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB hard limit per file, shop custom limit checked in service
  },
});

// 1. Shop details
router.get('/shops/:shopCode', customerController.getShopDetails);

// 2. Session management
router.post('/sessions', sessionLimiter, customerController.initSession);
router.get('/sessions/:sessionToken', customerController.getSessionState);

// 3. Document upload & management
router.post('/sessions/:sessionToken/files', uploadLimiter, upload.array('files', 20), customerController.uploadFiles);
router.delete('/sessions/:sessionToken/files/:filePublicId', customerController.deleteFile);

// 4. Per-document print configuration
router.put('/sessions/:sessionToken/files/:filePublicId/config', customerController.updateFileConfig);
router.patch('/sessions/:sessionToken/files/:filePublicId/download-permission', customerController.updateDownloadPermission);
router.patch('/sessions/:sessionToken/download-permission', customerController.updateAllDownloadPermissions);

// 5. Additional services on files
router.post('/sessions/:sessionToken/files/:filePublicId/services', customerController.addServiceToFile);
router.delete('/sessions/:sessionToken/files/:filePublicId/services/:serviceId', customerController.removeServiceFromFile);

// 6. Order confirmation
router.post('/sessions/:sessionToken/confirm', customerController.confirmOrder);

// 7. Public order status lookup
router.get('/orders/:orderNumber', customerController.getOrderStatus);

// 8. Document secure preview
router.get('/files/:filePublicId/preview', customerController.previewFile);

module.exports = router;
