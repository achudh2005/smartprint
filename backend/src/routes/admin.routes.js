/**
 * Super Admin Routes
 * Protected platform administration routes
 * Strictly guarded by authenticate + authorize('SUPER_ADMIN')
 */
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All Super Admin routes require valid JWT auth and SUPER_ADMIN role
router.use(authenticate);
router.use(authorize('SUPER_ADMIN'));

// Platform Overview & KPIs
router.get('/overview', adminController.getOverview);

// Shop Owner Creation (Super Admin provision)
router.post('/shop-owners', adminController.createShopOwner);

// Shop Management & Moderation
router.get('/shops', adminController.getShops);
router.patch('/shops/:shopId/status', adminController.updateShopStatus);

// User Management & Status / Password Controls
router.get('/users', adminController.getUsers);
router.patch('/users/:userId', adminController.updateUser);
router.post('/users/:userId/reset-password', adminController.resetPassword);

// Session Tracking & Revocation
router.get('/users/:userId/sessions', adminController.getUserSessions);
router.post('/users/:userId/revoke-all-sessions', adminController.revokeAllSessions);
router.post('/sessions/:sessionId/revoke', adminController.revokeSession);

// Login History
router.get('/users/:userId/login-history', adminController.getUserLoginHistory);

// Platform Security & Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
