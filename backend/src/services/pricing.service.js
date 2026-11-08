const { prisma } = require('../database/client');
const { parsePageRange } = require('./document.service');
const logger = require('../utils/logger');

// Default fallback pricing rules when shop has not yet configured custom rules
const DEFAULT_PRICING = {
  A4: {
    BLACK_WHITE: { SIMPLEX: 2.0, DUPLEX_LONG_EDGE: 1.5, DUPLEX_SHORT_EDGE: 1.5 },
    GRAYSCALE: { SIMPLEX: 2.0, DUPLEX_LONG_EDGE: 1.5, DUPLEX_SHORT_EDGE: 1.5 },
    COLOR: { SIMPLEX: 10.0, DUPLEX_LONG_EDGE: 8.0, DUPLEX_SHORT_EDGE: 8.0 },
  },
  A3: {
    BLACK_WHITE: { SIMPLEX: 5.0, DUPLEX_LONG_EDGE: 4.0, DUPLEX_SHORT_EDGE: 4.0 },
    GRAYSCALE: { SIMPLEX: 5.0, DUPLEX_LONG_EDGE: 4.0, DUPLEX_SHORT_EDGE: 4.0 },
    COLOR: { SIMPLEX: 20.0, DUPLEX_LONG_EDGE: 18.0, DUPLEX_SHORT_EDGE: 18.0 },
  },
  LEGAL: {
    BLACK_WHITE: { SIMPLEX: 3.0, DUPLEX_LONG_EDGE: 2.5, DUPLEX_SHORT_EDGE: 2.5 },
    GRAYSCALE: { SIMPLEX: 3.0, DUPLEX_LONG_EDGE: 2.5, DUPLEX_SHORT_EDGE: 2.5 },
    COLOR: { SIMPLEX: 12.0, DUPLEX_LONG_EDGE: 10.0, DUPLEX_SHORT_EDGE: 10.0 },
  },
};

/**
 * Resolve price per page for a shop given print configuration
 */
async function getPricePerPage(shopId, { colorMode, paperSize, duplexMode, totalPages }) {
  // Query active pricing rules for this shop
  const rules = await prisma.pricingRule.findMany({
    where: {
      shopId,
      isActive: true,
      colorMode,
      paperSize,
    },
    orderBy: { pricePerPage: 'asc' },
  });

  // Try exact duplex match
  let matchedRule = rules.find((r) => r.duplexMode === duplexMode);

  // Fallback to SIMPLEX rule if duplex rule isn't specifically defined
  if (!matchedRule) {
    matchedRule = rules.find((r) => r.duplexMode === 'SIMPLEX');
  }

  // Fallback to any rule for that color/paper size
  if (!matchedRule && rules.length > 0) {
    matchedRule = rules[0];
  }

  if (matchedRule) {
    return Number(matchedRule.pricePerPage);
  }

  // Fallback to platform default matrix
  const sizeConfig = DEFAULT_PRICING[paperSize] || DEFAULT_PRICING.A4;
  const colorConfig = sizeConfig[colorMode] || sizeConfig.BLACK_WHITE;
  const price = colorConfig[duplexMode] || colorConfig.SIMPLEX || 2.0;

  return price;
}

/**
 * Calculate pricing for a single file configuration and attached services
 */
async function calculateFilePrice(shopId, { file, config, services = [] }) {
  const totalPages = file.pageCount || 1;
  const pageRangeResult = parsePageRange(config.pageRange, totalPages);
  const effectivePages = pageRangeResult.count;
  const copies = Math.max(1, config.copies || 1);

  // Get authoritative price per page
  const pricePerPage = await getPricePerPage(shopId, {
    colorMode: config.colorMode,
    paperSize: config.paperSize,
    duplexMode: config.duplexMode,
    totalPages: effectivePages,
  });

  // Calculate base printing price
  const baseDocumentPrice = effectivePages * pricePerPage * copies;

  // Calculate attached services total
  let servicesTotal = 0;
  const serviceBreakdown = [];

  for (const item of services) {
    const serviceRecord = await prisma.additionalService.findFirst({
      where: {
        id: item.additionalServiceId,
        shopId,
        isActive: true,
      },
    });

    if (serviceRecord) {
      const qty = Math.max(1, item.quantity || 1);
      const unit = Number(serviceRecord.price);
      const lineTotal = unit * qty;
      servicesTotal += lineTotal;

      serviceBreakdown.push({
        serviceId: serviceRecord.id,
        name: serviceRecord.name,
        quantity: qty,
        unitPrice: unit,
        total: lineTotal,
      });
    }
  }

  const fileTotal = Number((baseDocumentPrice + servicesTotal).toFixed(2));

  return {
    unitPrice: pricePerPage,
    effectivePages,
    copies,
    baseDocumentPrice: Number(baseDocumentPrice.toFixed(2)),
    servicesTotal: Number(servicesTotal.toFixed(2)),
    calculatedTotal: fileTotal,
    serviceBreakdown,
  };
}

/**
 * Authoritatively calculate and validate complete order price
 */
async function calculateOrderTotal(shopId, orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderFiles: {
        include: {
          printConfiguration: true,
          orderFileServices: {
            include: { additionalService: true },
          },
        },
      },
    },
  });

  if (!order || order.shopId !== shopId) {
    throw new Error('Order not found or shop mismatch.');
  }

  let orderTotal = 0;
  const fileBreakdowns = [];

  for (const file of order.orderFiles) {
    if (file.status === 'FAILED') continue;

    const config = file.printConfiguration || {
      copies: 1,
      colorMode: 'BLACK_WHITE',
      paperSize: 'A4',
      orientation: 'PORTRAIT',
      duplexMode: 'SIMPLEX',
      pageRange: 'ALL',
    };

    const services = (file.orderFileServices || []).map((ofs) => ({
      additionalServiceId: ofs.additionalServiceId,
      quantity: ofs.quantity,
    }));

    const fileCalc = await calculateFilePrice(shopId, { file, config, services });

    // Update printConfiguration in DB with latest calculated totals
    if (file.printConfiguration) {
      await prisma.printConfiguration.update({
        where: { id: file.printConfiguration.id },
        data: {
          unitPrice: fileCalc.unitPrice,
          calculatedTotal: fileCalc.calculatedTotal,
        },
      });
    }

    orderTotal += fileCalc.calculatedTotal;
    fileBreakdowns.push({
      fileId: file.id,
      filePublicId: file.publicId,
      originalName: file.originalName,
      ...fileCalc,
    });
  }

  const finalTotal = Number(orderTotal.toFixed(2));

  // Update order total
  await prisma.order.update({
    where: { id: orderId },
    data: { totalAmount: finalTotal },
  });

  return {
    orderId,
    totalAmount: finalTotal,
    files: fileBreakdowns,
  };
}

module.exports = {
  getPricePerPage,
  calculateFilePrice,
  calculateOrderTotal,
};
