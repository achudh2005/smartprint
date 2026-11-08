// ============================================================
// Auth Routes
// ============================================================
const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

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

// Strict rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production' || isLocalOrLanIp(req.ip),
  message: { success: false, message: 'Too many login attempts. Please wait a few minutes before trying again.' },
});

// POST /api/v1/auth/register
router.post('/register',
  authLimiter,
  authController.registerValidation,
  authController.register
);

// POST /api/v1/auth/login
router.post('/login',
  authLimiter,
  authController.loginValidation,
  authController.login
);

// POST /api/v1/auth/refresh
router.post('/refresh', authController.refresh);

// POST /api/v1/auth/logout
router.post('/logout', authController.logout);

// POST /api/v1/auth/logout-all  (requires auth)
router.post('/logout-all', authenticate, authController.logoutAll);

// GET  /api/v1/auth/me  (requires auth)
router.get('/me', authenticate, authController.me);

module.exports = router;
