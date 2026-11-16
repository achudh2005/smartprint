/**
 * Super Admin Controller
 * Serves platform overview, shop provisioning, moderation, user management (CRUD),
 * active session monitoring & revocation, orders, printers, payments, telemetry, and audit logs.
 */
const adminService = require('../services/admin.service');
const { sendSuccess, sendCreated } = require('../utils/response');

const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await adminService.adminLogin({ email, password, ipAddress, userAgent });
    return sendSuccess(res, result, 'Super Admin authenticated successfully.');
  } catch (err) {
    next(err);
  }
};

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

const createUser = async (req, res, next) => {
  try {
    const data = await adminService.createUser(req.user, req.body);
    return sendCreated(res, data, 'User created successfully.');
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    const data = await adminService.deleteUser(req.user, targetUserId);
    return sendSuccess(res, data, 'User deleted permanently.');
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

const createShop = async (req, res, next) => {
  try {
    const data = await adminService.createShopDirect(req.user, req.body);
    return sendCreated(res, data, 'Shop created successfully.');
  } catch (err) {
    next(err);
  }
};

const deleteShop = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const data = await adminService.deleteShop(req.user, shopId);
    return sendSuccess(res, data, 'Shop and all associated resources deleted.');
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

const getOrders = async (req, res, next) => {
  try {
    const data = await adminService.listAllOrders(req.user, req.query);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const deleteOrder = async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    const data = await adminService.deleteOrder(req.user, orderId);
    return sendSuccess(res, data, 'Order deleted successfully.');
  } catch (err) {
    next(err);
  }
};

const getPrinters = async (req, res, next) => {
  try {
    const data = await adminService.listAllPrinters(req.user, req.query);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const deletePrinter = async (req, res, next) => {
  try {
    const printerId = parseInt(req.params.printerId, 10);
    const data = await adminService.deletePrinter(req.user, printerId);
    return sendSuccess(res, data, 'Printer deleted successfully.');
  } catch (err) {
    next(err);
  }
};

const getPayments = async (req, res, next) => {
  try {
    const data = await adminService.listAllPayments(req.user, req.query);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const getSystemHealth = async (req, res, next) => {
  try {
    const data = await adminService.getSystemHealth(req.user);
    return sendSuccess(res, data);
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

const bulkActionUsers = async (req, res, next) => {
  try {
    const data = await adminService.bulkActionUsers(req.user, req.body);
    return sendSuccess(res, data, `Bulk action '${req.body.action}' executed successfully.`);
  } catch (err) {
    next(err);
  }
};

const updateAdminNote = async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    const data = await adminService.updateAdminNote(req.user, targetUserId, req.body.note);
    return sendSuccess(res, data, 'Admin internal note updated.');
  } catch (err) {
    next(err);
  }
};

const updateSessionLimit = async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    const data = await adminService.updateSessionLimit(req.user, targetUserId, req.body.maxActiveSessions);
    return sendSuccess(res, data, 'Session limit updated successfully.');
  } catch (err) {
    next(err);
  }
};

const impersonateUser = async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    const data = await adminService.impersonateUser(req.user, targetUserId);
    return sendSuccess(res, data, `Impersonating user #${targetUserId}. Session valid for 15 minutes.`);
  } catch (err) {
    next(err);
  }
};

const broadcastMessage = async (req, res, next) => {
  try {
    const data = await adminService.broadcastMessage(req.user, req.body);
    return sendSuccess(res, data, 'Platform announcement dispatched to shop owners.');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  adminLogin,
  getOverview,
  createShopOwner,
  createUser,
  deleteUser,
  getShops,
  createShop,
  deleteShop,
  updateShopStatus,
  getUsers,
  updateUser,
  bulkActionUsers,
  updateAdminNote,
  updateSessionLimit,
  impersonateUser,
  broadcastMessage,
  getUserSessions,
  getUserLoginHistory,
  revokeSession,
  revokeAllSessions,
  resetPassword,
  getOrders,
  deleteOrder,
  getPrinters,
  deletePrinter,
  getPayments,
  getSystemHealth,
  getAuditLogs,
};
