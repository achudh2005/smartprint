// ============================================================
// Auth Controller – includes OTP verify / resend handlers
// ============================================================
const { body } = require('express-validator');
const authService = require('../services/auth.service');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');
const { validate } = require('../middleware/validate');

// ── Validation Chains ─────────────────────────────────────

const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Full name is required.')
    .isLength({ min: 2, max: 255 }).withMessage('Name must be between 2 and 255 characters.'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least one number.'),
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password.')
    .custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Passwords do not match.');
      return true;
    }),
  validate,
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required.'),
  validate,
];

const verifyOtpValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail(),
  body('otp')
    .trim()
    .notEmpty().withMessage('Verification code is required.')
    .isLength({ min: 6, max: 6 }).withMessage('Verification code must be exactly 6 digits.')
    .isNumeric().withMessage('Verification code must be numeric.'),
  validate,
];

const resendOtpValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail(),
  validate,
];

// ── Handlers ──────────────────────────────────────────────

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const result = await authService.register({ name, email, password });
    return sendCreated(res, {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }, 'Account created successfully. Welcome to SmartPrint!');
  } catch (error) {
    next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const result = await authService.verifyEmailOtp({ email, otp });
    return sendSuccess(res, {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }, 'Email verified successfully. Welcome to SmartPrint!');
  } catch (error) {
    next(error);
  }
};

const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.resendOtp({ email });
    return sendSuccess(res, result, 'A new verification code has been generated.');
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return sendSuccess(res, {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }, 'Logged in successfully.');
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return sendError(res, 'Refresh token is required.', 400);
    const result = await authService.refreshAccessToken(refreshToken);
    return sendSuccess(res, result, 'Token refreshed successfully.');
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    return sendSuccess(res, {}, 'Logged out successfully.');
  } catch (error) {
    next(error);
  }
};

const logoutAll = async (req, res, next) => {
  try {
    await authService.logoutAll(req.user.id);
    return sendSuccess(res, {}, 'Logged out from all devices.');
  } catch (error) {
    next(error);
  }
};

const me = async (req, res) => {
  return sendSuccess(res, { user: req.user }, 'User profile retrieved.');
};

module.exports = {
  registerValidation,
  loginValidation,
  verifyOtpValidation,
  resendOtpValidation,
  register,
  verifyOtp,
  resendOtp,
  login,
  refresh,
  logout,
  logoutAll,
  me,
};
