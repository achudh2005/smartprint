const crypto = require('crypto');
const { prisma } = require('../database/client');
const storageService = require('./storage.service');
const documentService = require('./document.service');
const pricingService = require('./pricing.service');
const { generateOrderNumber } = require('../utils/generators');
const logger = require('../utils/logger');

/**
 * Get public shop information by shopCode
 */
async function getShopByCode(shopCode) {
  const rawCode = decodeURIComponent(shopCode || '').trim();
  const normalizedCode = rawCode.replace(/\s+/g, '-').toUpperCase();

  const shop = await prisma.shop.findFirst({
    where: {
      status: 'ACTIVE',
      OR: [
        { shopCode: normalizedCode },
        { shopCode: rawCode.toUpperCase() },
        { shopCode: rawCode },
      ],
    },
    include: {
      shopSettings: true,
      additionalServices: {
        where: { isActive: true },
        select: { id: true, name: true, description: true, price: true },
      },
      pricingRules: {
        where: { isActive: true },
        select: { id: true, name: true, colorMode: true, paperSize: true, duplexMode: true, pricePerPage: true },
      },
    },
  });

  if (!shop || shop.status !== 'ACTIVE') {
    const err = new Error('Shop not found or currently inactive.');
    err.statusCode = 404;
    throw err;
  }

  return {
    publicId: shop.publicId,
    shopCode: shop.shopCode,
    name: shop.name,
    address: shop.address,
    logoUrl: shop.logoUrl,
    contactEmail: shop.contactEmail,
    contactPhone: shop.contactPhone,
    settings: {
      paymentEnabled: shop.shopSettings?.paymentEnabled ?? false,
      manualPrintEnabled: shop.shopSettings?.manualPrintEnabled ?? true,
      directPrintEnabled: shop.shopSettings?.directPrintEnabled ?? false,
      maxUploadSizeMb: shop.shopSettings?.maxUploadSizeMb ?? 50,
      acceptedFormats: (shop.shopSettings?.acceptedFormats || 'pdf,doc,docx,jpg,jpeg,png,txt')
        .split(',')
        .map((f) => f.trim().toLowerCase().replace(/^\./, ''))
        .filter(Boolean),
      currency: shop.shopSettings?.currency || 'INR',
      defaultExpiryHours: shop.shopSettings?.defaultExpiryHours || 24,
      enabledExpiryOptions: (shop.shopSettings?.enabledExpiryOptions || '15m,1h,3h,8h').split(',').map((o) => o.trim()),
      defaultExpiryOption: shop.shopSettings?.defaultExpiryOption || '1h',
      maxExpiryHours: shop.shopSettings?.maxExpiryHours || 8,
      razorpayKeyId: shop.shopSettings?.paymentEnabled ? (shop.shopSettings?.razorpayKeyId || process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key') : null,
    },
    additionalServices: shop.additionalServices,
    pricingRules: shop.pricingRules,
  };
}

/**
 * Get or create an anonymous customer session
 */
async function getOrCreateSession(shopCode, existingToken = null) {
  const rawCode = decodeURIComponent(shopCode || '').trim();
  const normalizedCode = rawCode.replace(/\s+/g, '-').toUpperCase();

  const shop = await prisma.shop.findFirst({
    where: {
      status: 'ACTIVE',
      OR: [
        { shopCode: normalizedCode },
        { shopCode: rawCode.toUpperCase() },
        { shopCode: rawCode },
      ],
    },
    include: { shopSettings: true },
  });

  if (!shop || shop.status !== 'ACTIVE') {
    const err = new Error('Shop not found or currently inactive.');
    err.statusCode = 404;
    throw err;
  }

  const now = new Date();

  // Try resuming existing token if provided
  if (existingToken) {
    const session = await prisma.customerSession.findUnique({
      where: { sessionToken: existingToken },
      include: {
        orders: {
          where: { status: 'PENDING' },
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
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (session && session.shopId === shop.id && session.status === 'ACTIVE' && session.expiresAt > now) {
      let draftOrder = session.orders[0];
      if (!draftOrder) {
        // Create draft order if none exists
        draftOrder = await prisma.order.create({
          data: {
            shopId: shop.id,
            sessionId: session.id,
            orderNumber: generateOrderNumber(),
            status: 'PENDING',
          },
          include: {
            orderFiles: {
              include: {
                printConfiguration: true,
                orderFileServices: { include: { additionalService: true } },
              },
            },
          },
        });
      }

      return { session, draftOrder, shop };
    }
  }

  // Create new anonymous session
  const expiryHours = shop.shopSettings?.defaultExpiryHours || 24;
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
  const sessionToken = `cs_${crypto.randomBytes(32).toString('hex')}`;

  const session = await prisma.customerSession.create({
    data: {
      shopId: shop.id,
      sessionToken,
      status: 'ACTIVE',
      expiresAt,
    },
  });

  // Create initial draft order
  const draftOrder = await prisma.order.create({
    data: {
      shopId: shop.id,
      sessionId: session.id,
      orderNumber: generateOrderNumber(),
      status: 'PENDING',
    },
    include: {
      orderFiles: {
        include: {
          printConfiguration: true,
          orderFileServices: { include: { additionalService: true } },
        },
      },
    },
  });

  return { session, draftOrder, shop };
}

/**
 * Validate active session
 */
async function validateSession(sessionToken) {
  const session = await prisma.customerSession.findUnique({
    where: { sessionToken },
    include: {
      shop: { include: { shopSettings: true } },
      orders: {
        where: { status: 'PENDING' },
        include: {
          orderFiles: {
            include: {
              printConfiguration: true,
              orderFileServices: { include: { additionalService: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!session) {
    const err = new Error('Invalid or expired customer session.');
    err.statusCode = 401;
    throw err;
  }

  if (session.status !== 'ACTIVE' || session.expiresAt < new Date()) {
    const err = new Error('Customer session has expired. Please rescan the QR code to start a new print request.');
    err.statusCode = 403;
    throw err;
  }

  let draftOrder = session.orders[0];
  if (!draftOrder) {
    draftOrder = await prisma.order.create({
      data: {
        shopId: session.shopId,
        sessionId: session.id,
        orderNumber: generateOrderNumber(),
        status: 'PENDING',
      },
      include: {
        orderFiles: {
          include: {
            printConfiguration: true,
            orderFileServices: { include: { additionalService: true } },
          },
        },
      },
    });
  }

  return { session, draftOrder, shop: session.shop };
}

/**
 * Upload multiple files to session draft order
 */
async function uploadFiles(sessionToken, rawFiles) {
  const { session, draftOrder, shop } = await validateSession(sessionToken);

  const maxUploadBytes = (shop.shopSettings?.maxUploadSizeMb || 50) * 1024 * 1024;
  const acceptedFormats = (shop.shopSettings?.acceptedFormats || 'pdf,doc,docx,jpg,jpeg,png,txt')
    .split(',')
    .map((f) => f.trim().toLowerCase().replace(/^\./, ''))
    .filter(Boolean);

  const processedFiles = [];

  for (const rawFile of rawFiles) {
    const ext = rawFile.originalname.split('.').pop().toLowerCase();

    // 1. Extension check
    if (!acceptedFormats.includes(ext)) {
      throw new Error(`File format ".${ext}" is not accepted by this print shop. Allowed formats: ${acceptedFormats.join(', ')}`);
    }

    // 2. Size check
    if (rawFile.size > maxUploadBytes) {
      throw new Error(`File "${rawFile.originalname}" exceeds the shop's maximum upload limit of ${shop.shopSettings?.maxUploadSizeMb} MB.`);
    }

    // 3. Save to private storage & verify signatures
    const stored = await storageService.saveUploadedFile({
      shopId: shop.id,
      sessionToken: session.sessionToken,
      file: rawFile,
    });

    // 4. Process document (page count & validity)
    const docInfo = await documentService.processDocument(stored.absolutePath, stored.mimeType, stored.extension);

    // Initial file lifetime starts immediately upon upload completion
    const { calculateExpiresAt } = require('./expiry.service');
    const defaultExpiryOpt = shop.shopSettings?.defaultExpiryOption || '1h';
    const initialExpiresAt = calculateExpiresAt(defaultExpiryOpt);

    // 5. Create OrderFile record
    const orderFile = await prisma.orderFile.create({
      data: {
        publicId: crypto.randomUUID(),
        orderId: draftOrder.id,
        originalName: stored.originalName,
        storagePath: stored.storagePath,
        mimeType: stored.mimeType,
        fileSizeBytes: BigInt(stored.sizeBytes),
        pageCount: docInfo.pageCount,
        status: docInfo.isValid ? 'READY' : 'FAILED',
        expiresAt: initialExpiresAt,
      },
    });

    // 6. Create default PrintConfiguration
    const defaultUnitPrice = await pricingService.getPricePerPage(shop.id, {
      colorMode: 'BLACK_WHITE',
      paperSize: 'A4',
      duplexMode: 'SIMPLEX',
      totalPages: docInfo.pageCount,
    });

    const calculatedTotal = Number((defaultUnitPrice * docInfo.pageCount).toFixed(2));

    const printConfig = await prisma.printConfiguration.create({
      data: {
        fileId: orderFile.id,
        copies: 1,
        colorMode: 'BLACK_WHITE',
        paperSize: 'A4',
        paperType: 'NORMAL',
        orientation: 'PORTRAIT',
        duplexMode: 'SIMPLEX',
        pageRange: 'ALL',
        unitPrice: defaultUnitPrice,
        calculatedTotal: calculatedTotal,
      },
    });

    processedFiles.push({
      ...orderFile,
      fileSizeBytes: orderFile.fileSizeBytes.toString(),
      printConfiguration: printConfig,
      isValid: docInfo.isValid,
      error: docInfo.error,
    });
  }

  // Recalculate order total
  await pricingService.calculateOrderTotal(shop.id, draftOrder.id);

  return processedFiles;
}

/**
 * Update print configuration for a file
 */
async function updateFileConfiguration(sessionToken, filePublicId, newConfig) {
  const { session, draftOrder, shop } = await validateSession(sessionToken);

  const file = await prisma.orderFile.findFirst({
    where: {
      publicId: filePublicId,
      orderId: draftOrder.id,
    },
    include: {
      printConfiguration: true,
      orderFileServices: { include: { additionalService: true } },
    },
  });

  if (!file) {
    const err = new Error('File not found in current session order.');
    err.statusCode = 404;
    throw err;
  }

  // Sanitize and validate inputs
  const copies = Math.max(1, parseInt(newConfig.copies, 10) || 1);
  const colorMode = ['COLOR', 'BLACK_WHITE', 'GRAYSCALE'].includes(newConfig.colorMode) ? newConfig.colorMode : 'BLACK_WHITE';
  const paperSize = ['A4', 'A3', 'A5', 'LETTER', 'LEGAL', 'CUSTOM'].includes(newConfig.paperSize) ? newConfig.paperSize : 'A4';
  const paperType = ['NORMAL', 'PREMIUM', 'PHOTO', 'BOND', 'GLOSSY', 'CUSTOM'].includes(newConfig.paperType) ? newConfig.paperType : (file.printConfiguration?.paperType || 'NORMAL');
  const orientation = ['PORTRAIT', 'LANDSCAPE'].includes(newConfig.orientation) ? newConfig.orientation : 'PORTRAIT';
  const duplexMode = ['SIMPLEX', 'DUPLEX_LONG_EDGE', 'DUPLEX_SHORT_EDGE'].includes(newConfig.duplexMode) ? newConfig.duplexMode : 'SIMPLEX';
  const pageRange = (newConfig.pageRange || 'ALL').trim();

  // Validate page range
  const rangeCheck = documentService.parsePageRange(pageRange, file.pageCount || 1);
  if (!rangeCheck.isValid) {
    const err = new Error(rangeCheck.error || 'Invalid page range specified.');
    err.statusCode = 400;
    throw err;
  }

  // Calculate new pricing
  const services = (file.orderFileServices || []).map((ofs) => ({
    additionalServiceId: ofs.additionalServiceId,
    quantity: ofs.quantity,
  }));

  const pricing = await pricingService.calculateFilePrice(shop.id, {
    file,
    config: { copies, colorMode, paperSize, paperType, orientation, duplexMode, pageRange },
    services,
  });

  // Update DB
  const updatedConfig = await prisma.printConfiguration.upsert({
    where: { fileId: file.id },
    create: {
      fileId: file.id,
      copies,
      colorMode,
      paperSize,
      paperType,
      orientation,
      duplexMode,
      pageRange,
      unitPrice: pricing.unitPrice,
      calculatedTotal: pricing.calculatedTotal,
    },
    update: {
      copies,
      colorMode,
      paperSize,
      paperType,
      orientation,
      duplexMode,
      pageRange,
      unitPrice: pricing.unitPrice,
      calculatedTotal: pricing.calculatedTotal,
    },
  });

  // Recalculate entire order total
  const orderSummary = await pricingService.calculateOrderTotal(shop.id, draftOrder.id);

  return {
    filePublicId,
    printConfiguration: updatedConfig,
    pricing,
    orderTotal: orderSummary.totalAmount,
  };
}

/**
 * Add or update an additional service on an uploaded file
 */
async function attachFileService(sessionToken, filePublicId, { serviceId, quantity = 1 }) {
  const { session, draftOrder, shop } = await validateSession(sessionToken);

  const file = await prisma.orderFile.findFirst({
    where: { publicId: filePublicId, orderId: draftOrder.id },
  });

  if (!file) {
    const err = new Error('File not found in current session order.');
    err.statusCode = 404;
    throw err;
  }

  const service = await prisma.additionalService.findFirst({
    where: { id: serviceId, shopId: shop.id, isActive: true },
  });

  if (!service) {
    const err = new Error('Service not available for this shop.');
    err.statusCode = 404;
    throw err;
  }

  const qty = Math.max(1, parseInt(quantity, 10) || 1);
  const unitPrice = Number(service.price);
  const total = Number((unitPrice * qty).toFixed(2));

  await prisma.orderFileService.upsert({
    where: {
      fileId_additionalServiceId: {
        fileId: file.id,
        additionalServiceId: service.id,
      },
    },
    create: {
      fileId: file.id,
      additionalServiceId: service.id,
      quantity: qty,
      unitPrice,
      total,
    },
    update: {
      quantity: qty,
      unitPrice,
      total,
    },
  });

  // Recalculate order total
  const orderSummary = await pricingService.calculateOrderTotal(shop.id, draftOrder.id);

  return {
    filePublicId,
    serviceId: service.id,
    orderTotal: orderSummary.totalAmount,
  };
}

/**
 * Remove an additional service from an uploaded file
 */
async function removeFileService(sessionToken, filePublicId, serviceId) {
  const { draftOrder, shop } = await validateSession(sessionToken);

  const file = await prisma.orderFile.findFirst({
    where: { publicId: filePublicId, orderId: draftOrder.id },
  });

  if (!file) {
    const err = new Error('File not found in current session order.');
    err.statusCode = 404;
    throw err;
  }

  await prisma.orderFileService.deleteMany({
    where: {
      fileId: file.id,
      additionalServiceId: serviceId,
    },
  });

  const orderSummary = await pricingService.calculateOrderTotal(shop.id, draftOrder.id);

  return {
    filePublicId,
    serviceId,
    orderTotal: orderSummary.totalAmount,
  };
}

/**
 * Remove an uploaded file
 */
async function deleteFile(sessionToken, filePublicId) {
  const { draftOrder, shop } = await validateSession(sessionToken);

  const file = await prisma.orderFile.findFirst({
    where: { publicId: filePublicId, orderId: draftOrder.id },
  });

  if (!file) {
    const err = new Error('File not found in current session.');
    err.statusCode = 404;
    throw err;
  }

  // Delete physical file
  await storageService.deleteStoredFile(file.storagePath);

  // Delete DB record (cascades to PrintConfiguration and OrderFileServices)
  await prisma.orderFile.delete({
    where: { id: file.id },
  });

  const orderSummary = await pricingService.calculateOrderTotal(shop.id, draftOrder.id);

  return {
    deletedFilePublicId: filePublicId,
    orderTotal: orderSummary.totalAmount,
  };
}

/**
 * Confirm and seal customer order
 */
async function confirmOrder(sessionToken, { notes = '', expiryOption, paymentMethod = 'COUNTER' } = {}) {
  const { session, draftOrder, shop } = await validateSession(sessionToken);
  const { calculateExpiresAt } = require('./expiry.service');
  const { scheduleOrderExpiry } = require('../queues/expiry.queue');

  const fullOrder = await prisma.order.findUnique({
    where: { id: draftOrder.id },
    include: {
      orderFiles: {
        include: {
          printConfiguration: true,
          orderFileServices: { include: { additionalService: true } },
        },
      },
    },
  });

  if (!fullOrder.orderFiles || fullOrder.orderFiles.length === 0) {
    const err = new Error('Cannot submit order: Please upload at least one document.');
    err.statusCode = 400;
    throw err;
  }

  // Ensure all files with valid content are ready for print
  for (const f of (fullOrder.orderFiles || [])) {
    if (f.status === 'FAILED' && Number(f.fileSizeBytes || 0) > 0) {
      await prisma.orderFile.update({
        where: { id: f.id },
        data: { status: 'READY', pageCount: Math.max(1, f.pageCount || 1) },
      });
      f.status = 'READY';
      f.pageCount = Math.max(1, f.pageCount || 1);
    }
  }

  // Check if any completely empty or invalid file remains
  const failedFile = (fullOrder.orderFiles || []).find((f) => f.status === 'FAILED');
  if (failedFile) {
    const err = new Error(`Cannot submit order: File "${failedFile.originalName}" is empty or unreadable. Please remove or replace it.`);
    err.statusCode = 400;
    throw err;
  }

  // Calculate authoritative total
  const orderSummary = await pricingService.calculateOrderTotal(shop.id, fullOrder.id);

  // Validate and compute customer file lifetime expiration
  const enabledOptions = (shop.shopSettings?.enabledExpiryOptions || '15m,1h,3h,8h')
    .split(',')
    .map((o) => o.trim());
  const maxHours = shop.shopSettings?.maxExpiryHours || 8;
  const optionHoursMap = {
    '15m': 0.25,
    '1h': 1,
    '3h': 3,
    '8h': 8,
  };

  let chosenExpiryOption = expiryOption || shop.shopSettings?.defaultExpiryOption || '1h';

  if (expiryOption) {
    if (!enabledOptions.includes(expiryOption)) {
      const err = new Error(`Selected expiry option "${expiryOption}" is not enabled for this print shop. Allowed options: ${enabledOptions.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
    if (optionHoursMap[expiryOption] && optionHoursMap[expiryOption] > maxHours) {
      const err = new Error(`Selected expiry option "${expiryOption}" exceeds the shop maximum policy of ${maxHours} hour(s).`);
      err.statusCode = 400;
      throw err;
    }
  }

  const expiresAt = calculateExpiresAt(chosenExpiryOption);

  // Synchronize file expiresAt
  await prisma.orderFile.updateMany({
    where: { orderId: fullOrder.id },
    data: { expiresAt },
  });

  // Determine if customer chose Online Payment and whether shop has it enabled
  const isOnlinePaymentEnabled = shop.shopSettings?.paymentEnabled || false;
  const isCounterChoice = (paymentMethod || '').toUpperCase() === 'COUNTER';
  const wantsOnlinePayment = !isCounterChoice && isOnlinePaymentEnabled;
  const initialStatus = wantsOnlinePayment ? 'PAYMENT_PENDING' : 'CONFIRMED';
  const chosenMethodEnum = wantsOnlinePayment ? 'RAZORPAY' : 'COUNTER';
  const paymentMethodLabel = wantsOnlinePayment ? 'Pay Online (Razorpay)' : 'Pay at Counter';

  // Update order status, total, and expiration
  const updatedOrder = await prisma.order.update({
    where: { id: fullOrder.id },
    data: {
      status: initialStatus,
      notes: notes || null,
      totalAmount: orderSummary.totalAmount,
      expiresAt,
      expiryOption: chosenExpiryOption,
    },
    include: {
      shop: { select: { name: true, shopCode: true, address: true, contactPhone: true } },
      orderFiles: {
        include: {
          printConfiguration: true,
          orderFileServices: { include: { additionalService: true } },
        },
      },
    },
  });

  // Sync expiration to all order files
  await prisma.orderFile.updateMany({
    where: { orderId: fullOrder.id },
    data: { expiresAt },
  });

  // Create initial Payment record matching customer choice
  if (!wantsOnlinePayment) {
    await prisma.payment.create({
      data: {
        orderId: fullOrder.id,
        amount: orderSummary.totalAmount,
        method: 'COUNTER',
        status: 'COUNTER_PAYMENT_DUE',
        referenceId: `COUNTER-DUE-${updatedOrder.orderNumber}`,
        notes: 'Pay at Counter: Customer selected to pay at shop counter upon document collection',
      },
    });
  } else {
    await prisma.payment.create({
      data: {
        orderId: fullOrder.id,
        amount: orderSummary.totalAmount,
        method: 'RAZORPAY',
        status: 'PENDING',
        referenceId: `ONLINE-PENDING-${updatedOrder.orderNumber}`,
        notes: 'Pay Online: Customer selected online payment via UPI/Cards (Razorpay)',
      },
    });
  }

  // Schedule automatic background deletion in BullMQ / timer queue
  const delayMs = Math.max(0, expiresAt.getTime() - Date.now());
  try {
    await scheduleOrderExpiry(updatedOrder.id, delayMs);
  } catch (schedErr) {
    logger.warn(`Failed to schedule automatic order expiry: ${schedErr.message}`);
  }

  // Record audit log
  await prisma.orderStatusLog.create({
    data: {
      orderId: fullOrder.id,
      fromStatus: 'PENDING',
      toStatus: initialStatus,
      note: wantsOnlinePayment
        ? 'Customer submitted order; pending online payment via Razorpay'
        : 'Customer submitted print request via QR portal (Pay at Counter)',
    },
  });

  // Mark session COMPLETED
  await prisma.customerSession.update({
    where: { id: session.id },
    data: { status: 'COMPLETED' },
  });

  const filesList = updatedOrder.orderFiles || fullOrder.orderFiles || [];

  // Create In-App Notification record for Shop
  try {
    await prisma.notification.create({
      data: {
        shopId: shop.id,
        title: 'New Print Order Received',
        message: `Order #${updatedOrder.orderNumber} received (${filesList.length} document(s)). Total: ₹${Number(updatedOrder.totalAmount).toFixed(2)} [${paymentMethodLabel} - ${wantsOnlinePayment ? 'Pending' : 'Due'}]`,
        type: 'ORDER_NEW',
      },
    });
  } catch (notifErr) {
    logger.warn(`Failed to create notification record: ${notifErr.message}`);
  }

  // Broadcast Real-Time Order Event to Shop Owners / Staff
  try {
    const { emitToShop } = require('../socket');
    emitToShop(shop.id, 'order:new', {
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      publicId: updatedOrder.publicId,
      status: updatedOrder.status,
      totalAmount: Number(updatedOrder.totalAmount),
      createdAt: updatedOrder.createdAt,
      expiresAt: updatedOrder.expiresAt,
      filesCount: filesList.length,
      notes: updatedOrder.notes,
      paymentMethod: chosenMethodEnum,
      paymentMethodLabel,
      paymentStatus: wantsOnlinePayment ? 'PENDING' : 'COUNTER_PAYMENT_DUE',
    });
  } catch (wsErr) {
    logger.warn(`Failed to broadcast order:new: ${wsErr.message}`);
  }

  return {
    id: updatedOrder.id,
    orderId: updatedOrder.id,
    orderNumber: updatedOrder.orderNumber,
    publicId: updatedOrder.publicId,
    status: updatedOrder.status,
    totalAmount: Number(updatedOrder.totalAmount),
    notes: updatedOrder.notes,
    expiresAt: updatedOrder.expiresAt,
    expiryOption: updatedOrder.expiryOption,
    createdAt: updatedOrder.createdAt,
    shop: updatedOrder.shop,
    filesCount: filesList.length,
    paymentRequired: wantsOnlinePayment,
    paymentMethod: chosenMethodEnum,
    paymentMethodLabel,
    paymentStatus: wantsOnlinePayment ? 'PENDING' : 'COUNTER_PAYMENT_DUE',
    files: filesList.map((f) => ({
      publicId: f.publicId,
      originalName: f.originalName,
      pageCount: f.pageCount,
      printConfiguration: f.printConfiguration || null,
      services: (f.orderFileServices || []).map((ofs) => ({
        name: ofs.additionalService?.name || 'Service',
        quantity: ofs.quantity,
        total: Number(ofs.total || 0),
      })),
    })),
  };
}

/**
 * Public order status lookup by orderNumber
 */
async function getOrderByNumber(orderNumber) {
  const normalizedOrderNumber = String(orderNumber || '').trim().toUpperCase();

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { orderNumber: normalizedOrderNumber },
        { orderNumber: String(orderNumber || '').trim() },
        { publicId: String(orderNumber || '').trim() },
      ],
    },
    include: {
      shop: {
        select: {
          name: true,
          shopCode: true,
          address: true,
          contactPhone: true,
          contactEmail: true,
          logoUrl: true,
          shopSettings: true,
        },
      },
      orderFiles: {
        include: {
          printConfiguration: true,
          orderFileServices: {
            include: { additionalService: true },
          },
        },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
      },
      statusLogs: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!order) {
    const err = new Error('Order not found.');
    err.statusCode = 404;
    throw err;
  }

  const latestPayment = (order.payments || [])[0];
  const paymentStatus = latestPayment ? latestPayment.status : (order.status === 'CONFIRMED' ? 'COUNTER_PAYMENT_DUE' : 'PAYMENT_PENDING');

  return {
    orderNumber: order.orderNumber,
    publicId: order.publicId,
    status: order.status,
    paymentStatus,
    totalAmount: Number(order.totalAmount || 0),
    createdAt: order.createdAt,
    expiresAt: order.expiresAt,
    expiryOption: order.expiryOption,
    shop: order.shop || { name: 'Print Shop', shopCode: '', address: 'In-store Print Counter' },
    files: (order.orderFiles || []).map((f) => ({
      publicId: f.publicId,
      originalName: f.originalName,
      pageCount: f.pageCount,
      status: f.status,
      printConfiguration: f.printConfiguration || null,
      services: (f.orderFileServices || []).map((s) => ({
        name: s.additionalService?.name || s.name || 'Service',
        quantity: s.quantity || 1,
        total: Number(s.total || 0),
      })),
    })),
    statusHistory: (order.statusLogs || []).map((l) => ({
      fromStatus: l.fromStatus,
      toStatus: l.toStatus,
      reason: l.reason,
      timestamp: l.createdAt,
    })),
  };
}

module.exports = {
  getShopByCode,
  getOrCreateSession,
  validateSession,
  uploadFiles,
  updateFileConfiguration,
  attachFileService,
  removeFileService,
  deleteFile,
  confirmOrder,
  getOrderByNumber,
};
