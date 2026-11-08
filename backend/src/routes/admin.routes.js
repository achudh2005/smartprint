/**
 * Super Admin Routes
 * Protected platform administration routes
 */
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All Super Admin routes require valid JWT auth
router.use(authenticate);

// Platform Overview & KPIs
router.get('/overview', adminController.getOverview);

// Shop Management & Moderation
router.get('/shops', adminController.getShops);
router.patch('/shops/:shopId/status', adminController.updateShopStatus);

// User Management
router.get('/users', adminController.getUsers);
router.patch('/users/:userId', adminController.updateUser);

// Platform Security & Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
