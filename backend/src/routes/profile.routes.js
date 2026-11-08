// ============================================================
// Profile Routes
// ============================================================
const express = require('express');
const profileController = require('../controllers/profile.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

// GET  /api/v1/profile
router.get('/', profileController.getProfile);

// PUT  /api/v1/profile
router.put('/',
  profileController.updateProfileValidation,
  profileController.updateProfile
);

// POST /api/v1/profile/change-password
router.post('/change-password',
  profileController.changePasswordValidation,
  profileController.changePassword
);

module.exports = router;
