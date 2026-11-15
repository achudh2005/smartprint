/**
 * Super Admin Controller
 * Serves platform overview, shop provisioning, moderation, user management,
 * active session monitoring & revocation, password resets, and audit logs.
 */
const adminService = require('../services/admin.service');
const { sendSuccess, sendCreated } = require('../utils/response');

const getOverview = async (req, res, next) => {
  try {
    const data = await adminService.getPlatformOverview(req.user);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const createShopOwner = async (req, res, next) => {
  try {
    const data = await adminService.createShopOwner(req.user, req.body);
    return sendCreated(res, data, 'Shop owner and shop provisioned successfully.');
  } catch (err) {
    next(err);
  }
};

const getShops = async (req, res, next) => {
  try {
    const data = await adminService.listAllShops(req.user, req.query);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const updateShopStatus = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const updated = await adminService.updateShopStatus(req.user, shopId, req.body);
    return sendSuccess(res, updated, 'Shop status updated successfully.');
  } catch (err) {
    next(err);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const data = await adminService.listAllUsers(req.user, req.query);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    const updated = await adminService.updateUser(req.user, targetUserId, req.body);
    return sendSuccess(res, updated, 'User updated successfully.');
  } catch (err) {
    next(err);
  }
};

const getUserSessions = async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    const data = await adminService.getUserSessions(req.user, targetUserId);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const getUserLoginHistory = async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    const data = await adminService.getUserLoginHistory(req.user, targetUserId, req.query);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const revokeSession = async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    const data = await adminService.revokeSession(req.user, sessionId);
    return sendSuccess(res, data, 'Session revoked successfully.');
  } catch (err) {
    next(err);
  }
};

const revokeAllSessions = async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    const data = await adminService.revokeAllUserSessions(req.user, targetUserId);
    return sendSuccess(res, data, 'All user sessions revoked successfully.');
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    const data = await adminService.resetUserPassword(req.user, targetUserId);
    return sendSuccess(res, data, 'Password reset successfully. Temporary credentials issued.');
  } catch (err) {
    next(err);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const data = await adminService.getAuditLogs(req.user, req.query);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOverview,
  createShopOwner,
  getShops,
  updateShopStatus,
  getUsers,
  updateUser,
  getUserSessions,
  getUserLoginHistory,
  revokeSession,
  revokeAllSessions,
  resetPassword,
  getAuditLogs,
};
