/**
 * Super Admin Routes
 * Protected platform administration routes & Master Console API
 */
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Public Super Admin Portal authentication
router.post('/auth/login', adminController.adminLogin);

// All subsequent Super Admin routes require valid JWT auth and SUPER_ADMIN role
router.use(authenticate);
router.use(authorize('SUPER_ADMIN'));

// Platform Overview & System Telemetry
router.get('/overview', adminController.getOverview);
router.get('/system-health', adminController.getSystemHealth);

// User Management (Full CRUD & Advanced Controls)
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.post('/users/bulk-action', adminController.bulkActionUsers);
router.patch('/users/:userId', adminController.updateUser);
router.delete('/users/:userId', adminController.deleteUser);
router.post('/users/:userId/reset-password', adminController.resetPassword);
router.patch('/users/:userId/notes', adminController.updateAdminNote);
router.patch('/users/:userId/session-limit', adminController.updateSessionLimit);
router.post('/users/:userId/impersonate', adminController.impersonateUser);

// Platform Announcements & Broadcasts
router.post('/broadcast', adminController.broadcastMessage);

// Shop Owner Creation (Super Admin provision)
router.post('/shop-owners', adminController.createShopOwner);

// Session Tracking & Revocation
router.get('/users/:userId/sessions', adminController.getUserSessions);
router.post('/users/:userId/revoke-all-sessions', adminController.revokeAllSessions);
router.post('/sessions/:sessionId/revoke', adminController.revokeSession);

// Login History
router.get('/users/:userId/login-history', adminController.getUserLoginHistory);

// Shop Management (Full CRUD)
router.get('/shops', adminController.getShops);
router.post('/shops', adminController.createShop);
router.delete('/shops/:shopId', adminController.deleteShop);
router.patch('/shops/:shopId/status', adminController.updateShopStatus);

// Master Orders Explorer & Management
router.get('/orders', adminController.getOrders);
router.delete('/orders/:orderId', adminController.deleteOrder);

// Network Printers & Hardware
router.get('/printers', adminController.getPrinters);
router.delete('/printers/:printerId', adminController.deletePrinter);

// Platform Payments & Revenue Ledger
router.get('/payments', adminController.getPayments);

// Platform Security & Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
