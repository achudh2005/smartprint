/**
 * Analytics Controller
 * Serves dashboard analytics, KPI aggregations, and export generation (CSV/JSON)
 */
const analyticsService = require('../services/analytics.service');
const { sendSuccess } = require('../utils/response');

const getAnalytics = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const data = await analyticsService.getShopAnalytics(shopId, req.user.id, req.query);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const exportCsv = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const csvContent = await analyticsService.generateCsvReport(shopId, req.user.id, req.query);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="smartprint_analytics_shop_${shopId}.csv"`);
    return res.send(csvContent);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAnalytics,
  exportCsv,
};
