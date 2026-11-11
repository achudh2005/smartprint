// ============================================================
// Report Service – Finance summaries, chart rendering, PDF + HTML emails
// ============================================================
// Dependencies: chartjs-node-canvas, pdf-lib (already installed)
// ============================================================
'use strict';

const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { prisma } = require('../database/client');
const { sendMail } = require('./email.service');
const logger = require('../utils/logger');

// ── Chart renderer (600px wide, retina-ish) ──────────────
const CHART_WIDTH = 600;
const CHART_HEIGHT = 260;
const chartRenderer = new ChartJSNodeCanvas({ width: CHART_WIDTH, height: CHART_HEIGHT, backgroundColour: '#ffffff' });

// ── Colour tokens ─────────────────────────────────────────
const ACCENT       = '#0E7490';
const ACCENT_LIGHT = '#A5F3FC';
const MUTED        = '#E4E4E7';

// ── Successful payment statuses ──────────────────────────
// Confirmed from schema.prisma PaymentStatus enum:
const SUCCESS_STATUSES = ['SUCCESS', 'COMPLETED', 'COUNTER_PAYMENT_COLLECTED'];

// ============================================================
// 1. getFinanceSummary
// ============================================================
/**
 * @param {number}  shopId
 * @param {Date}    startDate  Inclusive start of reporting period
 * @param {Date}    endDate    Inclusive end of reporting period
 * @returns {object} summary
 */
async function getFinanceSummary(shopId, startDate, endDate) {
  const periodMs = endDate.getTime() - startDate.getTime();
  const prevStart = new Date(startDate.getTime() - periodMs);
  const prevEnd   = new Date(startDate.getTime() - 1);

  // --- Current period ---
  const [orders, payments] = await Promise.all([
    prisma.order.findMany({
      where: {
        shopId,
        createdAt: { gte: startDate, lte: endDate },
        status: { notIn: ['CANCELLED', 'EXPIRED', 'REJECTED'] },
      },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        createdAt: true,
      },
    }),
    prisma.payment.findMany({
      where: {
        order: { shopId },
        status: { in: SUCCESS_STATUSES },
        paidAt: { gte: startDate, lte: endDate },
      },
      select: { amount: true, paidAt: true },
    }),
  ]);

  // --- Previous period (for % change) ---
  const [prevOrders, prevPayments] = await Promise.all([
    prisma.order.findMany({
      where: {
        shopId,
        createdAt: { gte: prevStart, lte: prevEnd },
        status: { notIn: ['CANCELLED', 'EXPIRED', 'REJECTED'] },
      },
      select: { id: true, status: true, totalAmount: true },
    }),
    prisma.payment.findMany({
      where: {
        order: { shopId },
        status: { in: SUCCESS_STATUSES },
        paidAt: { gte: prevStart, lte: prevEnd },
      },
      select: { amount: true },
    }),
  ]);

  // Aggregate current period
  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalOrders  = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Status breakdown
  const statusBreakdown = {};
  for (const o of orders) {
    statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
  }

  // Revenue by day (for line chart) – keyed YYYY-MM-DD
  const revenueByDay = {};
  for (const p of payments) {
    const day = p.paidAt.toISOString().slice(0, 10);
    revenueByDay[day] = (revenueByDay[day] || 0) + Number(p.amount);
  }

  // Build sorted day array spanning full period
  const dayLabels = [];
  const dayRevenues = [];
  const msPerDay = 86_400_000;
  for (let d = new Date(startDate); d <= endDate; d = new Date(d.getTime() + msPerDay)) {
    const key = d.toISOString().slice(0, 10);
    dayLabels.push(key.slice(5)); // MM-DD
    dayRevenues.push(revenueByDay[key] || 0);
  }

  // Previous period aggregates
  const prevRevenue = prevPayments.reduce((s, p) => s + Number(p.amount), 0);
  const prevOrderCount = prevOrders.length;
  const revChange   = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : null;
  const orderChange = prevOrderCount > 0 ? ((totalOrders - prevOrderCount) / prevOrderCount) * 100 : null;

  return {
    startDate, endDate,
    totalRevenue,
    totalOrders,
    avgOrderValue,
    statusBreakdown,
    dayLabels,
    dayRevenues,
    prevRevenue,
    prevOrderCount,
    revChange,
    orderChange,
  };
}

// ============================================================
// 2. renderCharts
// ============================================================
/**
 * @param {object} summary  Result of getFinanceSummary()
 * @returns {{ revenueChart: Buffer, statusChart: Buffer }}
 */
async function renderCharts(summary) {
  // Revenue line chart
  const revenueChart = await chartRenderer.renderToBuffer({
    type: 'bar',
    data: {
      labels: summary.dayLabels,
      datasets: [{
        label: 'Revenue (₹)',
        data: summary.dayRevenues,
        backgroundColor: ACCENT_LIGHT,
        borderColor: ACCENT,
        borderWidth: 2,
        borderRadius: 4,
        hoverBackgroundColor: ACCENT,
      }],
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Daily Revenue',
          color: '#18181b',
          font: { size: 13, weight: '600', family: 'sans-serif' },
        },
      },
      scales: {
        x: { grid: { color: MUTED }, ticks: { color: '#71717a', font: { size: 10 } } },
        y: {
          grid: { color: MUTED },
          ticks: { color: '#71717a', font: { size: 10 }, callback: (v) => `₹${v}` },
          beginAtZero: true,
        },
      },
    },
  });

  // Status breakdown bar chart
  const statusLabels = Object.keys(summary.statusBreakdown);
  const statusValues = statusLabels.map((k) => summary.statusBreakdown[k]);
  const statusColors = statusLabels.map((s) => {
    switch (s) {
      case 'COLLECTED':
      case 'COMPLETED': return '#15803d';
      case 'PENDING':   return '#B45309';
      case 'REJECTED':
      case 'CANCELLED': return '#B91C1C';
      default:          return ACCENT;
    }
  });

  const statusChart = await chartRenderer.renderToBuffer({
    type: 'bar',
    data: {
      labels: statusLabels,
      datasets: [{
        label: 'Orders',
        data: statusValues,
        backgroundColor: statusColors,
        borderRadius: 4,
      }],
    },
    options: {
      responsive: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Orders by Status',
          color: '#18181b',
          font: { size: 13, weight: '600', family: 'sans-serif' },
        },
      },
      scales: {
        x: { grid: { color: MUTED }, ticks: { color: '#71717a', stepSize: 1 }, beginAtZero: true },
        y: { grid: { display: false }, ticks: { color: '#71717a', font: { size: 10 } } },
      },
    },
  });

  return { revenueChart, statusChart };
}

// ============================================================
// 3. renderReportHtml
// ============================================================
function fmt(n) { return `₹${Number(n).toFixed(2)}`; }
function fmtPct(v) {
  if (v === null || v === undefined) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}
function fmtPeriod(start, end) {
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  return `${start.toLocaleDateString('en-IN', opts)} – ${end.toLocaleDateString('en-IN', opts)}`;
}

/**
 * @param {object} shop    Prisma Shop record (with shopCode, name)
 * @param {string} period  'Weekly' | 'Monthly'
 * @param {object} summary
 * @param {{ revenueChart: Buffer, statusChart: Buffer }} chartImages
 * @param {string} revCid   Content-ID for revenue chart
 * @param {string} statuCid Content-ID for status chart
 */
function renderReportHtml(shop, period, summary, chartImages, revCid, statuCid) {
  const pctColor = (v) => {
    if (v === null) return '#71717a';
    return v >= 0 ? '#15803d' : '#B91C1C';
  };

  const kpis = [
    {
      label: 'Total Revenue',
      value: fmt(summary.totalRevenue),
      sub: `${fmtPct(summary.revChange)} vs prev. period`,
      color: pctColor(summary.revChange),
    },
    {
      label: 'Total Orders',
      value: summary.totalOrders.toString(),
      sub: `${fmtPct(summary.orderChange)} vs prev. period`,
      color: pctColor(summary.orderChange),
    },
    {
      label: 'Avg. Order Value',
      value: fmt(summary.avgOrderValue),
      sub: `${summary.totalOrders} orders in period`,
      color: '#71717a',
    },
    {
      label: 'Prev. Period Revenue',
      value: fmt(summary.prevRevenue),
      sub: 'Comparison baseline',
      color: '#71717a',
    },
  ];

  const kpiRow = kpis.map((k) => `
    <td align="center" valign="top" width="25%" style="padding:0 6px;">
      <div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:10px;padding:16px 12px;text-align:center;">
        <p style="margin:0;font-size:11px;font-weight:600;color:#71717a;letter-spacing:0.8px;text-transform:uppercase;">${k.label}</p>
        <p style="margin:6px 0 4px;font-size:22px;font-weight:800;color:#18181b;font-variant-numeric:tabular-nums;">${k.value}</p>
        <p style="margin:0;font-size:12px;color:${k.color};font-weight:600;">${k.sub}</p>
      </div>
    </td>`).join('');

  const statusRows = Object.entries(summary.statusBreakdown).map(([s, n]) =>
    `<tr style="border-top:1px solid #f4f4f5;">
       <td style="padding:7px 12px;font-size:13px;color:#18181b;font-weight:500;">${s}</td>
       <td style="padding:7px 12px;font-size:13px;color:#18181b;text-align:right;font-variant-numeric:tabular-nums;font-weight:600;">${n}</td>
     </tr>`
  ).join('');

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${period} Finance Report – ${shop.name}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
  <!-- Header -->
  <tr><td style="background:#0e7490;padding:28px 36px;">
    <p style="margin:0;font-size:11px;font-weight:600;color:#a5f3fc;letter-spacing:1.5px;text-transform:uppercase;">${period} Finance Report</p>
    <p style="margin:6px 0 2px;font-size:22px;font-weight:800;color:#ffffff;">${shop.name}</p>
    <p style="margin:0;font-size:13px;color:#a5f3fc;">${fmtPeriod(summary.startDate, summary.endDate)}</p>
  </td></tr>
  <!-- KPIs -->
  <tr><td style="padding:28px 30px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>${kpiRow}</tr></table>
  </td></tr>
  <!-- Revenue chart -->
  <tr><td style="padding:0 30px 20px;">
    <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#18181b;">Revenue Over Time</p>
    <img src="cid:${revCid}" width="580" height="${Math.round(CHART_HEIGHT * 580/CHART_WIDTH)}" alt="Revenue chart" style="border-radius:8px;border:1px solid #e4e4e7;display:block;"/>
  </td></tr>
  <!-- Status chart -->
  <tr><td style="padding:0 30px 20px;">
    <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#18181b;">Orders by Status</p>
    <img src="cid:${statuCid}" width="580" height="${Math.round(CHART_HEIGHT * 580/CHART_WIDTH)}" alt="Status chart" style="border-radius:8px;border:1px solid #e4e4e7;display:block;"/>
  </td></tr>
  <!-- Status breakdown table -->
  <tr><td style="padding:0 30px 28px;">
    <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#18181b;">Status Breakdown</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
      <tr style="background:#f4f4f5;">
        <th style="padding:8px 12px;font-size:11px;color:#71717a;text-align:left;font-weight:600;letter-spacing:0.5px;">STATUS</th>
        <th style="padding:8px 12px;font-size:11px;color:#71717a;text-align:right;font-weight:600;letter-spacing:0.5px;">ORDERS</th>
      </tr>
      ${statusRows}
    </table>
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding:16px 30px;border-top:1px solid #f4f4f5;background:#fafafa;">
    <p style="margin:0;font-size:12px;color:#a1a1aa;">
      © ${new Date().getFullYear()} SmartPrint &bull; Shop Code: ${shop.shopCode} &bull; This is an automated report.
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

// ============================================================
// 4. renderReportPdf
// ============================================================
/**
 * Builds a 1–2 page PDF with KPIs + charts.
 * @returns {Buffer}
 */
async function renderReportPdf(shop, period, summary, chartImages) {
  const doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const margin = 48;

  let y = height - margin;

  // Header block
  page.drawRectangle({ x: 0, y: height - 72, width, height: 72, color: rgb(0.055, 0.455, 0.565) });
  page.drawText('SmartPrint', { x: margin, y: height - 28, font: helveticaBold, size: 16, color: rgb(1,1,1) });
  page.drawText(`${period} Finance Report — ${shop.name}`, { x: margin, y: height - 46, font: helvetica, size: 11, color: rgb(0.647, 0.953, 0.988) });
  page.drawText(fmtPeriod(summary.startDate, summary.endDate), { x: margin, y: height - 62, font: helvetica, size: 10, color: rgb(0.647, 0.953, 0.988) });

  y = height - 72 - 32;

  // KPIs in a 2×2 grid
  const kpis = [
    { label: 'Total Revenue',    value: fmt(summary.totalRevenue) },
    { label: 'Total Orders',     value: summary.totalOrders.toString() },
    { label: 'Avg. Order Value', value: fmt(summary.avgOrderValue) },
    { label: 'Prev. Revenue',    value: fmt(summary.prevRevenue) },
  ];
  const colW = (width - 2 * margin - 24) / 2;
  for (let i = 0; i < kpis.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = margin + col * (colW + 24);
    const by = y - row * 72;
    page.drawRectangle({ x: bx, y: by - 52, width: colW, height: 52, borderColor: rgb(0.894, 0.894, 0.902), borderWidth: 1, color: rgb(0.98, 0.98, 0.98), borderRadius: 6 });
    page.drawText(kpis[i].label.toUpperCase(), { x: bx + 12, y: by - 20, font: helveticaBold, size: 8, color: rgb(0.44, 0.44, 0.44) });
    page.drawText(kpis[i].value, { x: bx + 12, y: by - 38, font: helveticaBold, size: 15, color: rgb(0.098, 0.098, 0.106) });
  }
  y -= 2 * 72 + 24;

  // Revenue chart image
  try {
    const revImg = await doc.embedPng(chartImages.revenueChart);
    const imgW = width - 2 * margin;
    const imgH = imgW * (CHART_HEIGHT / CHART_WIDTH);
    if (y - imgH - 24 > margin) {
      page.drawText('Daily Revenue', { x: margin, y, font: helveticaBold, size: 11, color: rgb(0.098, 0.098, 0.106) });
      page.drawImage(revImg, { x: margin, y: y - 16 - imgH, width: imgW, height: imgH });
      y -= imgH + 36;
    }
  } catch (_) {}

  // Status chart on second page if needed
  const page2 = doc.addPage([595, 842]);
  let y2 = page2.getSize().height - margin;

  try {
    const stImg = await doc.embedPng(chartImages.statusChart);
    const imgW = page2.getSize().width - 2 * margin;
    const imgH = imgW * (CHART_HEIGHT / CHART_WIDTH);
    page2.drawText('Orders by Status', { x: margin, y: y2, font: helveticaBold, size: 11, color: rgb(0.098, 0.098, 0.106) });
    page2.drawImage(stImg, { x: margin, y: y2 - 16 - imgH, width: imgW, height: imgH });
    y2 -= imgH + 36;
  } catch (_) {}

  // Status table
  const statusEntries = Object.entries(summary.statusBreakdown);
  page2.drawText('Status Breakdown', { x: margin, y: y2, font: helveticaBold, size: 11, color: rgb(0.098, 0.098, 0.106) });
  y2 -= 20;
  for (const [s, n] of statusEntries) {
    page2.drawText(s, { x: margin, y: y2, font: helvetica, size: 10, color: rgb(0.098, 0.098, 0.106) });
    page2.drawText(n.toString(), { x: page2.getSize().width - margin - 30, y: y2, font: helveticaBold, size: 10, color: rgb(0.098, 0.098, 0.106) });
    y2 -= 16;
    if (y2 < margin) break;
  }

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

// ============================================================
// 5. sendReportEmail
// ============================================================
/**
 * Renders HTML + PDF and sends the report email to qualifying recipients.
 * @param {object} shop    Full shop object with settings
 * @param {string} period  'Weekly' | 'Monthly'
 * @param {Date}   startDate
 * @param {Date}   endDate
 * @param {string[]} recipientEmails
 */
async function sendReportEmail(shop, period, startDate, endDate, recipientEmails) {
  if (!recipientEmails || recipientEmails.length === 0) {
    logger.info(`[Report] No qualified recipients for shop ${shop.id} (${shop.name}). Skipping.`);
    return;
  }

  logger.info(`[Report] Generating ${period} report for shop ${shop.id} (${shop.name})`);

  const summary = await getFinanceSummary(shop.id, startDate, endDate);
  const chartImages = await renderCharts(summary);

  const revCid = `revenue-chart-${shop.shopCode}@smartprint`;
  const statuCid = `status-chart-${shop.shopCode}@smartprint`;

  const html = renderReportHtml(shop, period, summary, chartImages, revCid, statuCid);

  const dateTag = `${startDate.toISOString().slice(0,10)}_${endDate.toISOString().slice(0,10)}`;
  const pdfBuffer = await renderReportPdf(shop, period, summary, chartImages);

  const subject = `${period} Finance Report — ${shop.name} (${fmtPeriod(startDate, endDate)})`;

  await sendMail({
    to: recipientEmails,
    subject,
    html,
    attachments: [
      {
        filename: `SmartPrint_${period}Report_${shop.shopCode}_${dateTag}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
      {
        filename: 'revenue-chart.png',
        content: chartImages.revenueChart,
        contentType: 'image/png',
        // Resend supports inline via Content-ID; pass as inline:
        cid: revCid,
      },
      {
        filename: 'status-chart.png',
        content: chartImages.statusChart,
        contentType: 'image/png',
        cid: statuCid,
      },
    ],
  });

  logger.info(`[Report] ${period} report sent for shop ${shop.id} to: ${recipientEmails.join(', ')}`);
}

// ============================================================
// 6. sendReportsForAllShops
// ============================================================
/**
 * Iterate all ACTIVE shops, build + send reports.
 * Per-shop errors are caught so one failure won't stop others.
 *
 * @param {string} period     'Weekly' | 'Monthly'
 * @param {Date}   startDate
 * @param {Date}   endDate
 */
async function sendReportsForAllShops(period, startDate, endDate) {
  const shops = await prisma.shop.findMany({
    where: { status: 'ACTIVE' },
    include: {
      shopSettings: { select: { timezone: true } },
      shopUsers: {
        where: {
          status: 'ACTIVE',
          role: { in: ['OWNER', 'MANAGER'] },
          user: { emailVerified: true, status: 'ACTIVE' },
        },
        include: {
          user: { select: { email: true, name: true } },
        },
      },
    },
  });

  logger.info(`[Report] Processing ${period} reports for ${shops.length} active shops.`);

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const shop of shops) {
    try {
      const recipients = shop.shopUsers.map((su) => su.user.email).filter(Boolean);
      if (recipients.length === 0) {
        logger.info(`[Report] Shop ${shop.id} (${shop.name}): no verified owners/managers – skipped.`);
        skipCount++;
        continue;
      }

      await sendReportEmail(shop, period, startDate, endDate, recipients);
      successCount++;
    } catch (err) {
      failCount++;
      logger.error(`[Report] Failed for shop ${shop.id} (${shop.name}): ${err.message}`);
    }
  }

  logger.info(`[Report] ${period} run complete. Success: ${successCount}, Skipped: ${skipCount}, Failed: ${failCount}`);
}

/**
 * Compute previous full week (Mon–Sun) in a given timezone.
 * Falls back to UTC if timezone is invalid.
 */
function getPrevWeekRange(timezone = 'Asia/Kolkata') {
  const now = new Date();
  // Find last Monday
  const dayOfWeek = now.getDay(); // 0=Sun..6=Sat
  const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - daysBack);
  thisMonday.setHours(0, 0, 0, 0);
  const prevMonday = new Date(thisMonday);
  prevMonday.setDate(thisMonday.getDate() - 7);
  const prevSunday = new Date(prevMonday);
  prevSunday.setDate(prevMonday.getDate() + 6);
  prevSunday.setHours(23, 59, 59, 999);
  return { startDate: prevMonday, endDate: prevSunday };
}

/**
 * Compute previous full calendar month.
 */
function getPrevMonthRange() {
  const now = new Date();
  const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startDate = new Date(firstThisMonth);
  startDate.setMonth(startDate.getMonth() - 1);
  const endDate = new Date(firstThisMonth.getTime() - 1);
  return { startDate, endDate };
}

/**
 * Send a finance report for a single shop immediately.
 * @param {number} shopId
 * @param {'Weekly'|'Monthly'} period
 */
async function sendReportForSingleShop(shopId, period = 'Weekly') {
  const capitalPeriod = period.charAt(0).toUpperCase() + period.slice(1).toLowerCase();
  let startDate, endDate;
  if (capitalPeriod === 'Weekly') {
    ({ startDate, endDate } = getPrevWeekRange());
  } else {
    ({ startDate, endDate } = getPrevMonthRange());
  }

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: {
      shopSettings: { select: { timezone: true } },
      shopUsers: {
        where: {
          role: { in: ['OWNER', 'MANAGER'] },
          status: 'ACTIVE',
          user: { status: 'ACTIVE', emailVerified: true },
        },
        include: {
          user: { select: { email: true, name: true } },
        },
      },
    },
  });

  if (!shop) {
    const err = new Error('Shop not found.');
    err.statusCode = 404;
    throw err;
  }

  const recipients = shop.shopUsers.map((su) => su.user?.email).filter(Boolean);
  if (recipients.length === 0) {
    const err = new Error('No verified shop owners or managers found to receive the report.');
    err.statusCode = 400;
    throw err;
  }

  await sendReportEmail(shop, capitalPeriod, startDate, endDate, recipients);
  return {
    shopId,
    shopName: shop.name,
    period: capitalPeriod,
    recipients,
    dateRange: { startDate, endDate },
  };
}

module.exports = {
  getFinanceSummary,
  renderCharts,
  renderReportHtml,
  renderReportPdf,
  sendReportEmail,
  sendReportsForAllShops,
  sendReportForSingleShop,
  getPrevWeekRange,
  getPrevMonthRange,
};
