// ============================================================
// Auth Routes – includes OTP verify / resend endpoints
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

// Strict rate limit for auth endpoints (brute-force & credential stuffing defense)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production' || isLocalOrLanIp(req.ip),
  message: { success: false, message: 'Too many login attempts from this network. Please wait a few minutes before trying again.' },
});

// Tighter rate limit for OTP resend (max 3 per 15 minutes per IP)
const resendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.OTP_RESEND_RATE_LIMIT_MAX) || 3,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production' || isLocalOrLanIp(req.ip),
  message: { success: false, message: 'Too many resend requests. Please wait before requesting another code.' },
});

// POST /api/v1/auth/register
router.post('/register',
  authLimiter,
  authController.registerValidation,
  authController.register
);

// POST /api/v1/auth/verify-otp
// Called after registration (or login with unverified email) to submit the 6-digit code.
router.post('/verify-otp',
  authLimiter,
  authController.verifyOtpValidation,
  authController.verifyOtp
);

// POST /api/v1/auth/resend-otp
// Re-send a fresh OTP code (max 3 per 15 min per IP).
router.post('/resend-otp',
  resendOtpLimiter,
  authController.resendOtpValidation,
  authController.resendOtp
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
