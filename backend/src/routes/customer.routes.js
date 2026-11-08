const express = require('express');
const multer = require('multer');
const os = require('os');
const path = require('path');
const customerController = require('../controllers/customer.controller');

const router = express.Router();

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
router.post('/sessions', customerController.initSession);
router.get('/sessions/:sessionToken', customerController.getSessionState);

// 3. Document upload & management
router.post('/sessions/:sessionToken/files', upload.array('files', 20), customerController.uploadFiles);
router.delete('/sessions/:sessionToken/files/:filePublicId', customerController.deleteFile);

// 4. Per-document print configuration
router.put('/sessions/:sessionToken/files/:filePublicId/config', customerController.updateFileConfig);

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
