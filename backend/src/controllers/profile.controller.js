// ============================================================
// Profile Controller
// ============================================================
const { body } = require('express-validator');
const { prisma } = require('../database/client');
const { sendSuccess, sendError } = require('../utils/response');
const { validate } = require('../middleware/validate');
const argon2 = require('argon2');
const logger = require('../utils/logger');

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: parseInt(process.env.ARGON2_MEMORY_COST) || 65536,
  timeCost: parseInt(process.env.ARGON2_TIME_COST) || 3,
  parallelism: parseInt(process.env.ARGON2_PARALLELISM) || 4,
};

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 }).withMessage('Name must be between 2 and 255 characters.'),
  validate,
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword')
    .notEmpty().withMessage('New password is required.')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Must contain an uppercase letter.')
    .matches(/[a-z]/).withMessage('Must contain a lowercase letter.')
    .matches(/[0-9]/).withMessage('Must contain a number.'),
  body('confirmNewPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) throw new Error('Passwords do not match.');
      return true;
    }),
  validate,
];

const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, publicId: true, name: true, email: true,
        role: true, status: true, emailVerified: true,
        lastLoginAt: true, createdAt: true,
      },
    });
    return sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name },
      select: { id: true, publicId: true, name: true, email: true, role: true, updatedAt: true },
    });
    return sendSuccess(res, { user }, 'Profile updated successfully.');
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, passwordHash: true },
    });

    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) return sendError(res, 'Current password is incorrect.', 400);

    const newHash = await argon2.hash(newPassword, ARGON2_OPTIONS);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newHash },
    });

    logger.info(`Password changed for user ${req.user.id}`);
    return sendSuccess(res, {}, 'Password changed successfully.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateProfileValidation,
  changePasswordValidation,
  getProfile,
  updateProfile,
  changePassword,
};
