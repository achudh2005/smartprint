/**
 * Analytics & Reporting Service
 * Computes business intelligence, revenue metrics, physical print volume,
 * service usage breakdowns, and report exports.
 *
 * CRITICAL ACCOUNTING RULES:
 * 1. Revenue uses exclusively verified online payments ('SUCCESS') and recorded counter collections ('COUNTER_PAYMENT_COLLECTED').
 * 2. Pages printed uses completed/confirmed print activity from PrintJob records, not merely uploaded estimates.
 */
const { prisma } = require('../database/client');

/**
 * Get comprehensive analytics for a shop across a timeframe
 */
async function getShopAnalytics(shopId, userId, { range = '30d', startDate, endDate } = {}) {
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
  });
  if (!membership || membership.status !== 'ACTIVE') {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  // Calculate Date bounds
  let fromDate = new Date();
  let toDate = new Date();

  if (startDate && endDate) {
    fromDate = new Date(startDate);
    toDate = new Date(endDate);
    toDate.setHours(23, 59, 59, 999);
  } else if (range === 'today') {
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);
  } else if (range === '7d') {
    fromDate.setDate(fromDate.getDate() - 7);
    fromDate.setHours(0, 0, 0, 0);
  } else if (range === '90d') {
    fromDate.setDate(fromDate.getDate() - 90);
    fromDate.setHours(0, 0, 0, 0);
  } else {
    // Default 30d
    fromDate.setDate(fromDate.getDate() - 30);
    fromDate.setHours(0, 0, 0, 0);
  }

  // 1. Fetch Orders within range
  const orders = await prisma.order.findMany({
    where: {
      shopId,
      createdAt: { gte: fromDate, lte: toDate },
    },
    include: {
      orderFiles: {
        include: {
          printConfiguration: true,
          orderFileServices: { include: { additionalService: true } },
          printJobs: true,
        },
      },
      payments: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // 2. Compute Daily / Summary KPIs
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  let todayOrdersCount = 0;
  let todayRevenue = 0;
  let todayPagesPrinted = 0;

  let totalOrders = orders.length;
  let pendingOrders = 0;
  let completedOrders = 0;
  let rejectedOrders = 0;
  let cancelledOrders = 0;
  let inProgressOrders = 0;

  orders.forEach((o) => {
    const isToday = o.createdAt >= todayStart && o.createdAt <= todayEnd;
    if (isToday) todayOrdersCount++;

    if (['PENDING', 'PAYMENT_PENDING'].includes(o.status)) pendingOrders++;
    else if (['COLLECTED', 'COMPLETED'].includes(o.status)) completedOrders++;
    else if (o.status === 'REJECTED') rejectedOrders++;
    else if (o.status === 'CANCELLED') cancelledOrders++;
    else inProgressOrders++;
  });

  // 3. Compute Verified Revenue & Payments Statistics
  const payments = await prisma.payment.findMany({
    where: {
      order: { shopId },
      createdAt: { gte: fromDate, lte: toDate },
    },
    include: { order: true },
  });

  let totalVerifiedRevenue = 0;
  let onlineRevenue = 0;
  let counterRevenue = 0;
  let successfulOnlineCount = 0;
  let counterCollectedCount = 0;
  let pendingPaymentsCount = 0;
  let failedPaymentsCount = 0;

  payments.forEach((p) => {
    const amt = Number(p.amount);
    const isToday = p.createdAt >= todayStart && p.createdAt <= todayEnd;

    if (p.status === 'SUCCESS' || p.status === 'COMPLETED') {
      totalVerifiedRevenue += amt;
      onlineRevenue += amt;
      successfulOnlineCount++;
      if (isToday) todayRevenue += amt;
    } else if (p.status === 'COUNTER_PAYMENT_COLLECTED') {
      totalVerifiedRevenue += amt;
      counterRevenue += amt;
      counterCollectedCount++;
      if (isToday) todayRevenue += amt;
    } else if (p.status === 'PENDING' || p.status === 'COUNTER_PAYMENT_DUE') {
      pendingPaymentsCount++;
    } else if (p.status === 'FAILED') {
      failedPaymentsCount++;
    }
  });

  // 4. Compute Physical Print Activity (Pages physically printed from PrintJobs)
  const allPrintJobs = await prisma.printJob.findMany({
    where: {
      file: { order: { shopId } },
      createdAt: { gte: fromDate, lte: toDate },
    },
    include: {
      file: {
        include: { printConfiguration: true },
      },
    },
  });

  let totalPagesPrinted = 0;
  let colorPages = 0;
  let bwPages = 0;

  const paperTypeCounts = {
    NORMAL: 0,
    PREMIUM: 0,
    GLOSSY: 0,
    CARDSTOCK: 0,
  };

  const serviceCounts = {};

  allPrintJobs.forEach((pj) => {
    // Only count verified completed print jobs
    const isCompleted = ['COMPLETED', 'DRIVER_COMPLETED', 'MANUALLY_CONFIRMED'].includes(pj.status);
    if (!isCompleted) return;

    const file = pj.file;
    const config = file?.printConfiguration || {};
    const copies = config.copies || 1;
    const pages = file?.pageCount || 1;
    const jobPages = pages * copies;

    totalPagesPrinted += jobPages;

    const isToday = pj.completedAt ? (pj.completedAt >= todayStart && pj.completedAt <= todayEnd) : (pj.createdAt >= todayStart && pj.createdAt <= todayEnd);
    if (isToday) todayPagesPrinted += jobPages;

    if (config.colorMode === 'COLOR') colorPages += jobPages;
    else bwPages += jobPages;

    const pType = config.paperType || 'NORMAL';
    paperTypeCounts[pType] = (paperTypeCounts[pType] || 0) + jobPages;
  });

  // Additional services usage across orders
  orders.forEach((o) => {
    o.orderFiles.forEach((f) => {
      f.orderFileServices?.forEach((ofs) => {
        const sName = ofs.additionalService?.name || 'Standard Service';
        serviceCounts[sName] = (serviceCounts[sName] || 0) + 1;
      });
    });
  });

  // 5. Build Time-Series Trend Data (Daily buckets)
  const trendMap = new Map();
  const daysDiff = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / (24 * 3600 * 1000)));

  for (let i = 0; i <= daysDiff; i++) {
    const d = new Date(fromDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    trendMap.set(dateStr, {
      date: dateStr,
      revenue: 0,
      orders: 0,
      pages: 0,
    });
  }

  payments.forEach((p) => {
    if (p.status === 'SUCCESS' || p.status === 'COMPLETED' || p.status === 'COUNTER_PAYMENT_COLLECTED') {
      const dateStr = p.createdAt.toISOString().split('T')[0];
      if (trendMap.has(dateStr)) {
        trendMap.get(dateStr).revenue += Number(p.amount);
      }
    }
  });

  orders.forEach((o) => {
    const dateStr = o.createdAt.toISOString().split('T')[0];
    if (trendMap.has(dateStr)) {
      trendMap.get(dateStr).orders += 1;
    }
  });

  allPrintJobs.forEach((pj) => {
    if (['COMPLETED', 'DRIVER_COMPLETED', 'MANUALLY_CONFIRMED'].includes(pj.status)) {
      const dateStr = (pj.completedAt || pj.createdAt).toISOString().split('T')[0];
      if (trendMap.has(dateStr)) {
        const pages = (pj.file?.pageCount || 1) * (pj.file?.printConfiguration?.copies || 1);
        trendMap.get(dateStr).pages += pages;
      }
    }
  });

  const dailyTrends = Array.from(trendMap.values()).map((t) => ({
    ...t,
    revenue: Number(t.revenue.toFixed(2)),
  }));

  // 6. Storage metrics
  const files = await prisma.orderFile.findMany({
    where: { order: { shopId } },
    select: { fileSizeBytes: true, isPurged: true },
  });

  let activeStorageBytes = BigInt(0);
  let purgedStorageBytes = BigInt(0);

  files.forEach((f) => {
    if (f.isPurged) purgedStorageBytes += BigInt(f.fileSizeBytes || 0);
    else activeStorageBytes += BigInt(f.fileSizeBytes || 0);
  });

  return {
    kpis: {
      today: {
        orders: todayOrdersCount,
        revenue: Number(todayRevenue.toFixed(2)),
        pagesPrinted: todayPagesPrinted,
      },
      period: {
        totalOrders,
        completedOrders,
        pendingOrders,
        rejectedOrders,
        cancelledOrders,
        inProgressOrders,
        totalRevenue: Number(totalVerifiedRevenue.toFixed(2)),
        onlineRevenue: Number(onlineRevenue.toFixed(2)),
        counterRevenue: Number(counterRevenue.toFixed(2)),
        totalPagesPrinted,
        colorPages,
        bwPages,
      },
      payments: {
        successfulOnlineCount,
        counterCollectedCount,
        pendingPaymentsCount,
        failedPaymentsCount,
      },
      storage: {
        activeBytes: activeStorageBytes.toString(),
        purgedBytes: purgedStorageBytes.toString(),
      },
    },
    breakdowns: {
      colorDistribution: [
        { label: 'Black & White', pages: bwPages },
        { label: 'Color', pages: colorPages },
      ],
      paperTypeUsage: Object.entries(paperTypeCounts).map(([type, pages]) => ({ type, pages })),
      serviceUsage: Object.entries(serviceCounts).map(([service, count]) => ({ service, count })),
    },
    trends: dailyTrends,
  };
}

/**
 * Generate CSV representation of orders report
 */
async function generateCsvReport(shopId, userId, params) {
  const analytics = await getShopAnalytics(shopId, userId, params);

  const lines = [];
  lines.push('SMARTPRINT BUSINESS REPORT');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('--- SUMMARY KPIS ---');
  lines.push(`Total Orders,${analytics.kpis.period.totalOrders}`);
  lines.push(`Total Verified Revenue (INR),${analytics.kpis.period.totalRevenue}`);
  lines.push(`Online Revenue (Razorpay),${analytics.kpis.period.onlineRevenue}`);
  lines.push(`Counter Cash/UPI Revenue,${analytics.kpis.period.counterRevenue}`);
  lines.push(`Total Pages Printed,${analytics.kpis.period.totalPagesPrinted}`);
  lines.push(`B&W Pages,${analytics.kpis.period.bwPages}`);
  lines.push(`Color Pages,${analytics.kpis.period.colorPages}`);
  lines.push('');
  lines.push('--- DAILY TRENDS ---');
  lines.push('Date,Orders,Pages Printed,Revenue (INR)');

  analytics.trends.forEach((t) => {
    lines.push(`${t.date},${t.orders},${t.pages},${t.revenue}`);
  });

  return lines.join('\n');
}

module.exports = {
  getShopAnalytics,
  generateCsvReport,
};
