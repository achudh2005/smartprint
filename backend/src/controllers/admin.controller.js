/**
 * Super Admin Controller
 * Serves platform overview, shop moderation, user management, and audit logs
 */
const adminService = require('../services/admin.service');
const { sendSuccess } = require('../utils/response');

const getOverview = async (req, res, next) => {
  try {
    const data = await adminService.getPlatformOverview(req.user);
    return sendSuccess(res, data);
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
  getShops,
  updateShopStatus,
  getUsers,
  updateUser,
  getAuditLogs,
};
