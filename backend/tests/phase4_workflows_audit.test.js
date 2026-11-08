/**
 * SmartPrint Phase 4 Workflows & Security Audit Test Suite
 * Strictly verifies all 6 core workflows (A through F) and security requirements:
 * - Workflow A: Automatic file expiry, physical unlinking, HTTP 410, and deletion log
 * - Workflow B: Owner expiry extension, new timestamp, and outdated queued job protection
 * - Workflow C: Online payment with Razorpay, HMAC verification, webhook, and idempotency
 * - Workflow D: Failed payment handling, rejection, and error responses
 * - Workflow E: Counter payment workflow, dues, collection, and revenue aggregation
 * - Workflow F: Two-shop multi-tenant isolation across files, expiry, payments, and sessions
 * - Additional Security: Invalid expiry validation, magic byte checking, in-flight print protection
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { InMemoryPrisma } = require('./mockPrisma');
const inMemoryPrisma = new InMemoryPrisma();

// Intercept database singleton with in-memory persistence
const clientPath = require.resolve('../src/database/client');
require.cache[clientPath] = {
  id: clientPath,
  filename: clientPath,
  loaded: true,
  exports: inMemoryPrisma,
};

const prisma = inMemoryPrisma;
const expiryService = require('../src/services/expiry.service');
const paymentService = require('../src/services/payment.service');
const shopService = require('../src/services/shop.service');
const customerService = require('../src/services/customer.service');
const storageService = require('../src/services/storage.service');

async function runAudit() {
  console.log('================================================================');
  console.log('  SMARTPRINT PHASE 4: FULL WORKFLOWS & SECURITY VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // ---------------------------------------------------------
    // Setup Base Multi-Tenant Fixtures
    // ---------------------------------------------------------
    const userA = await prisma.user.create({
      data: { email: 'ownerA@shopa.com', passwordHash: 'hash', name: 'Owner A', role: 'OWNER' },
    });
    const userB = await prisma.user.create({
      data: { email: 'ownerB@shopb.com', passwordHash: 'hash', name: 'Owner B', role: 'OWNER' },
    });

    const shopA = await prisma.shop.create({
      data: { name: 'Alpha Fast Print', shopCode: 'SP-ALPHA-01', ownerId: userA.id, status: 'ACTIVE' },
    });
    const shopB = await prisma.shop.create({
      data: { name: 'Beta Xerox Center', shopCode: 'SP-BETA-02', ownerId: userB.id, status: 'ACTIVE' },
    });

    await prisma.shopUser.create({
      data: { shopId: shopA.id, userId: userA.id, role: 'OWNER', status: 'ACTIVE' },
    });
    await prisma.shopUser.create({
      data: { shopId: shopB.id, userId: userB.id, role: 'OWNER', status: 'ACTIVE' },
    });

    const shopASettings = await prisma.shopSettings.create({
      data: {
        shopId: shopA.id,
        enabledExpiryOptions: '15m,1h,3h',
        defaultExpiryOption: '1h',
        maxExpiryHours: 3,
        paymentEnabled: true,
        razorpayKeyId: 'rzp_test_shopA_key',
        razorpayKeySecret: 'secret_shopA_998877',
        razorpayWebhookSecret: 'webhook_shopA_secret',
      },
    });

    const shopBSettings = await prisma.shopSettings.create({
      data: {
        shopId: shopB.id,
        enabledExpiryOptions: '15m,1h,3h,8h',
        defaultExpiryOption: '3h',
        maxExpiryHours: 8,
        paymentEnabled: false, // Online payments disabled
      },
    });

    // ---------------------------------------------------------
    // Workflow A: Automatic Expiry & Physical Unlinking
    // ---------------------------------------------------------
    console.log('\n--- Workflow A: Automatic File Expiry & Privacy Enforcement ---');
    
    // Create temporary test files on disk
    const tempDir = path.resolve(process.cwd(), 'uploads/test_audit_workflow_a');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const docPathA = path.join(tempDir, 'customer_contract.pdf');
    const previewPathA = path.join(tempDir, 'customer_contract_preview.pdf');
    fs.writeFileSync(docPathA, '%PDF-1.4 Test contract for automated purge workflow');
    fs.writeFileSync(previewPathA, '%PDF-1.4 Preview copy');
    
    assert(fs.existsSync(docPathA), 'Workflow A test original document created on disk');
    assert(fs.existsSync(previewPathA), 'Workflow A test preview file created on disk');

    const sessionA = await prisma.customerSession.create({
      data: {
        shopId: shopA.id,
        sessionToken: 'token_workflow_a_' + crypto.randomBytes(16).toString('hex'),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    });

    const orderA = await prisma.order.create({
      data: {
        orderNumber: 'ORD-WF-A-001',
        shopId: shopA.id,
        sessionId: sessionA.id,
        status: 'CONFIRMED',
        totalAmount: 50.0,
        expiryOption: '15m',
        expiresAt: new Date(Date.now() - 1000), // simulate past expiration
      },
    });

    const fileA = await prisma.orderFile.create({
      data: {
        orderId: orderA.id,
        publicId: 'file-wf-a-uuid-1',
        originalName: 'customer_contract.pdf',
        storagePath: docPathA,
        mimeType: 'application/pdf',
        fileSizeBytes: BigInt(fs.statSync(docPathA).size),
        pageCount: 5,
        status: 'READY',
        isPurged: false,
        expiresAt: orderA.expiresAt,
      },
    });

    // Execute background automated purge
    const purgeResultA = await expiryService.expireOrderFiles(orderA.id, {
      reason: 'Automated 15m lifetime expiry triggered',
      action: 'AUTO_EXPIRED',
    });

    assert(purgeResultA.success === true, 'expireOrderFiles executed successfully');
    assert(purgeResultA.filesPurged === 1, '1 file purged');
    assert(!fs.existsSync(docPathA), 'Original document permanently unlinked from disk');
    assert(!fs.existsSync(previewPathA), 'Associated preview PDF permanently unlinked from disk');

    // Verify database record updates
    const updatedFileA = await prisma.orderFile.findUnique({ where: { id: fileA.id } });
    assert(updatedFileA.isPurged === true, 'File record marked isPurged = true');
    assert(updatedFileA.status === 'EXPIRED', 'File status set to EXPIRED');
    assert(updatedFileA.deletedAt !== null, 'File deletedAt timestamp recorded');

    // Verify HTTP 410 rejection on download and preview
    let downloadBlocked = false;
    try {
      expiryService.assertDocumentNotExpired(updatedFileA);
    } catch (e) {
      if (e.statusCode === 410) downloadBlocked = true;
    }
    assert(downloadBlocked, 'assertDocumentNotExpired throws HTTP 410 Gone for purged file');

    // Verify physical printing blocked on expired file
    let printBlocked = false;
    try {
      await shopService.recordPrintJob(shopA.id, userA.id, {
        orderId: orderA.id,
        fileId: fileA.id,
        copies: 1,
        status: 'SUCCESS',
      });
    } catch (e) {
      if (e.statusCode === 410) printBlocked = true;
    }
    assert(printBlocked, 'Physical print job blocked with HTTP 410 Gone for expired document');

    // Verify expiry_logs entry
    const logsA = await prisma.expiryLog.findMany({ where: { orderId: orderA.id } });
    assert(logsA.length >= 1, 'Expiry log entry written to expiry_logs');
    assert(logsA[0].action === 'AUTO_EXPIRED', 'Action recorded as AUTO_EXPIRED');
    assert(Number(logsA[0].bytesFreed) > 0, `Bytes freed accurately tracked (${logsA[0].bytesFreed} bytes)`);

    // ---------------------------------------------------------
    // Workflow B: Owner Expiry Extension & Outdated Queued Job Protection
    // ---------------------------------------------------------
    console.log('\n--- Workflow B: Owner Expiry Extension & Outdated Job Protection ---');
    
    const docPathB = path.join(tempDir, 'active_plans.pdf');
    fs.writeFileSync(docPathB, '%PDF-1.4 Architectural plans');
    
    const orderB = await prisma.order.create({
      data: {
        orderNumber: 'ORD-WF-B-002',
        shopId: shopA.id,
        status: 'CONFIRMED',
        totalAmount: 120.0,
        expiryOption: '1h',
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour in future
      },
    });

    const fileB = await prisma.orderFile.create({
      data: {
        orderId: orderB.id,
        publicId: 'file-wf-b-uuid-2',
        originalName: 'active_plans.pdf',
        storagePath: docPathB,
        mimeType: 'application/pdf',
        fileSizeBytes: BigInt(fs.statSync(docPathB).size),
        pageCount: 12,
        status: 'READY',
        isPurged: false,
        expiresAt: orderB.expiresAt,
      },
    });

    // Owner extends expiry by +60 minutes
    const initialExpiryB = new Date(orderB.expiresAt);
    const extendResult = await expiryService.extendOrderExpiry(shopA.id, userA.id, orderB.id, 60);
    assert(extendResult.success === true, 'Owner successfully extended order expiry');
    assert(new Date(extendResult.expiresAt).getTime() > initialExpiryB.getTime(), 'New expiresAt pushed +60m forward');

    // CRITICAL EDGE CASE: Simulate an old queued job firing for orderB
    // The order was extended to the future, so the old queued job MUST NOT purge the file!
    const oldJobResult = await expiryService.expireOrderFiles(orderB.id, {
      reason: 'Outdated queued background job',
      action: 'AUTO_EXPIRED',
    });

    assert(oldJobResult.skipped === true, 'Outdated queued job was safely SKIPPED');
    assert(fs.existsSync(docPathB), 'Document was NOT prematurely deleted by old queued job');
    assert(expiryService.assertDocumentNotExpired(fileB) === undefined, 'Document remains fully accessible and not expired');

    // ---------------------------------------------------------
    // Workflow C: Online Payment (Razorpay Full Flow)
    // ---------------------------------------------------------
    console.log('\n--- Workflow C: Online Payment (Razorpay Order, HMAC & Webhook) ---');
    
    const orderC = await prisma.order.create({
      data: {
        orderNumber: 'ORD-WF-C-003',
        shopId: shopA.id,
        status: 'PAYMENT_PENDING',
        totalAmount: 150.0,
        expiryOption: '3h',
        expiresAt: new Date(Date.now() + 3 * 3600 * 1000),
      },
    });

    // 1. Create Razorpay Order
    const rzpOrderRes = await paymentService.createRazorpayOrder(orderC.id);
    assert(rzpOrderRes.success === true, 'Razorpay order created via backend');
    assert(rzpOrderRes.amount === 15000, 'Order amount in paise correctly computed: 150 * 100 = 15000');
    assert(Boolean(rzpOrderRes.razorpayOrderId), `Received Razorpay Order ID: ${rzpOrderRes.razorpayOrderId}`);

    // Verify initial Payment record created in PENDING status
    const pendingPayment = await prisma.payment.findFirst({ where: { razorpayOrderId: rzpOrderRes.razorpayOrderId } });
    assert(pendingPayment !== null, 'Payment record initialized in database');
    assert(pendingPayment.status === 'PENDING', 'Payment record status is PENDING');

    // 2. Client completes payment and submits valid HMAC signature
    const testPaymentId = 'pay_audit_test_success_777';
    const validSignature = crypto
      .createHmac('sha256', shopASettings.razorpayKeySecret)
      .update(`${rzpOrderRes.razorpayOrderId}|${testPaymentId}`)
      .digest('hex');

    const verifyRes = await paymentService.verifyRazorpayPayment({
      orderId: orderC.id,
      razorpayOrderId: rzpOrderRes.razorpayOrderId,
      razorpayPaymentId: testPaymentId,
      razorpaySignature: validSignature,
    });

    assert(verifyRes.success === true, 'Razorpay signature verified successfully');
    assert(verifyRes.payment.status === 'SUCCESS', 'Payment status updated to SUCCESS in MySQL');

    const confirmedOrderC = await prisma.order.findUnique({ where: { id: orderC.id } });
    assert(confirmedOrderC.status === 'CONFIRMED', 'Order status moved from PAYMENT_PENDING to CONFIRMED');

    // 3. Webhook Handling & Idempotency
    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: testPaymentId,
            order_id: rzpOrderRes.razorpayOrderId,
            amount: 15000,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };
    const webhookBodyStr = JSON.stringify(webhookPayload);
    const webhookSig = crypto
      .createHmac('sha256', shopASettings.razorpayWebhookSecret)
      .update(webhookBodyStr)
      .digest('hex');

    // Duplicate webhook delivery
    const webhookRes = await paymentService.handleRazorpayWebhook(webhookPayload, webhookSig, webhookBodyStr);
    assert(webhookRes.idempotent === true, 'Duplicate webhook identified and handled idempotently without re-crediting');

    // ---------------------------------------------------------
    // Workflow D: Failed Payment & Invalid Signature Rejection
    // ---------------------------------------------------------
    console.log('\n--- Workflow D: Failed Payment & Invalid Signature Rejection ---');
    
    const orderD = await prisma.order.create({
      data: {
        orderNumber: 'ORD-WF-D-004',
        shopId: shopA.id,
        status: 'PAYMENT_PENDING',
        totalAmount: 85.0,
      },
    });

    const rzpOrderD = await paymentService.createRazorpayOrder(orderD.id);

    // Tampered / forged signature
    let invalidSigCaught = false;
    try {
      await paymentService.verifyRazorpayPayment({
        orderId: orderD.id,
        razorpayOrderId: rzpOrderD.razorpayOrderId,
        razorpayPaymentId: 'pay_fraud_999',
        razorpaySignature: 'bad_forged_signature_0000',
      });
    } catch (e) {
      if (e.statusCode === 400) invalidSigCaught = true;
    }
    assert(invalidSigCaught, 'Invalid/forged signature rejected with HTTP 400 Bad Request');

    const paymentD = await prisma.payment.findFirst({ where: { razorpayOrderId: rzpOrderD.razorpayOrderId } });
    assert(paymentD.status === 'FAILED', 'Payment record updated to FAILED');

    const orderDAfter = await prisma.order.findUnique({ where: { id: orderD.id } });
    assert(orderDAfter.status === 'PAYMENT_PENDING', 'Order was NOT falsely confirmed after payment failure');

    // ---------------------------------------------------------
    // Workflow E: Counter Payment (Online Payments Disabled)
    // ---------------------------------------------------------
    console.log('\n--- Workflow E: Counter Payment Workflow (Shop B) ---');
    
    const orderE = await prisma.order.create({
      data: {
        orderNumber: 'ORD-WF-E-005',
        shopId: shopB.id,
        status: 'CONFIRMED',
        totalAmount: 60.0,
      },
    });

    // Verify online payments blocked for Shop B
    let onlineBlocked = false;
    try {
      await paymentService.createRazorpayOrder(orderE.id);
    } catch (e) {
      if (e.statusCode === 400) onlineBlocked = true;
    }
    assert(onlineBlocked, 'Razorpay online order creation blocked for shop with paymentEnabled = false');

    // Record counter payment collection
    const counterPayment = await paymentService.recordCounterPayment(shopB.id, userB.id, orderE.id, {
      amount: 60.0,
      method: 'CASH',
      notes: 'Collected at counter register',
    });

    assert(counterPayment.status === 'COUNTER_PAYMENT_COLLECTED', 'Counter payment status recorded as COUNTER_PAYMENT_COLLECTED');
    assert(Number(counterPayment.amount) === 60.0, 'Collected counter amount is ₹60.00');
    assert(counterPayment.method === 'CASH', 'Payment method is CASH');

    // Verify payment ledger for Shop B
    const ledgerB = await paymentService.getShopPayments(shopB.id, userB.id);
    assert(ledgerB.stats.counterRevenue === 60.0, 'Counter revenue of ₹60.00 accurately reported in Shop B ledger');
    assert(ledgerB.stats.onlineRevenue === 0.0, 'Online revenue is ₹0.00 for Shop B');
    assert(ledgerB.stats.totalRevenue === 60.0, 'Total revenue is ₹60.00');

    // ---------------------------------------------------------
    // Workflow F: Two-Shop Multi-Tenant Isolation
    // ---------------------------------------------------------
    console.log('\n--- Workflow F: Multi-Tenant Isolation (Shop A vs Shop B) ---');

    // 1. Owner B attempts to extend Shop A's order expiry
    let crossExtendBlocked = false;
    try {
      await expiryService.extendOrderExpiry(shopA.id, userB.id, orderB.id, 60);
    } catch (e) {
      if (e.statusCode === 403) crossExtendBlocked = true;
    }
    assert(crossExtendBlocked, 'User B blocked with HTTP 403 when attempting to extend Shop A file expiry');

    // 2. Owner B attempts to immediately purge Shop A's files
    let crossPurgeBlocked = false;
    try {
      await expiryService.purgeOrderFilesImmediately(shopA.id, userB.id, orderB.id);
    } catch (e) {
      if (e.statusCode === 403) crossPurgeBlocked = true;
    }
    assert(crossPurgeBlocked, 'User B blocked with HTTP 403 when attempting to purge Shop A files');

    // 3. Owner A attempts to view Shop B's payments ledger
    let crossLedgerBlocked = false;
    try {
      await paymentService.getShopPayments(shopB.id, userA.id);
    } catch (e) {
      if (e.statusCode === 403) crossLedgerBlocked = true;
    }
    assert(crossLedgerBlocked, 'User A blocked with HTTP 403 when attempting to access Shop B payment ledger');

    // 4. Owner A attempts to record counter payment on Shop B's order
    let crossCounterBlocked = false;
    try {
      await paymentService.recordCounterPayment(shopB.id, userA.id, orderE.id, { amount: 60 });
    } catch (e) {
      if (e.statusCode === 403) crossCounterBlocked = true;
    }
    assert(crossCounterBlocked, 'User A blocked with HTTP 403 when attempting to record payment on Shop B');

    // ---------------------------------------------------------
    // Security Tests: Expiry Validation & File Signatures
    // ---------------------------------------------------------
    console.log('\n--- Security: Input Validation, File Signatures & In-Flight Printing ---');

    // 1. Customer attempts to select an expiry not enabled by the shop
    // Shop A only enabled '15m,1h,3h', customer tries '8h'
    let invalidOptionBlocked = false;
    const sessionVal = await prisma.customerSession.create({
      data: {
        shopId: shopA.id,
        sessionToken: 'token_val_' + crypto.randomBytes(16).toString('hex'),
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
    });
    const draftVal = await prisma.order.create({
      data: {
        orderNumber: 'ORD-VAL-001',
        shopId: shopA.id,
        sessionId: sessionVal.id,
        status: 'PENDING',
        totalAmount: 10.0,
      },
    });
    const fileVal = await prisma.orderFile.create({
      data: {
        orderId: draftVal.id,
        originalName: 'doc.pdf',
        storagePath: docPathB,
        mimeType: 'application/pdf',
        fileSizeBytes: BigInt(100),
        pageCount: 1,
        status: 'READY',
      },
    });
    await prisma.printConfiguration.create({
      data: {
        fileId: fileVal.id,
        copies: 1,
        colorMode: 'BLACK_WHITE',
        paperSize: 'A4',
        paperType: 'NORMAL',
        orientation: 'PORTRAIT',
        duplexMode: 'SIMPLEX',
        pageRange: 'ALL',
        unitPrice: 10.0,
        calculatedTotal: 10.0,
      },
    });

    try {
      await customerService.confirmOrder(sessionVal.sessionToken, { expiryOption: '8h' });
    } catch (e) {
      console.log('   [Debug Validation Catch]:', e.statusCode, e.message);
      if (e.statusCode === 400 && e.message.includes('not enabled')) invalidOptionBlocked = true;
    }
    assert(invalidOptionBlocked, 'Customer selection of disabled expiry option (8h) rejected with HTTP 400 Bad Request');

    // 2. In-Flight Print Job Protection
    // An order in 'PRINTING' status must NOT be purged while physical printing is underway!
    const orderPrinting = await prisma.order.create({
      data: {
        orderNumber: 'ORD-PRINTING-001',
        shopId: shopA.id,
        status: 'PRINTING',
        totalAmount: 25.0,
        expiresAt: new Date(Date.now() - 5000),
      },
    });
    await prisma.orderFile.create({
      data: {
        orderId: orderPrinting.id,
        originalName: 'active_print.pdf',
        storagePath: docPathB,
        mimeType: 'application/pdf',
        fileSizeBytes: BigInt(100),
        pageCount: 1,
        status: 'PRINTING',
        isPurged: false,
      },
    });

    const printingPurgeRes = await expiryService.expireOrderFiles(orderPrinting.id, {
      reason: 'Scheduled lifetime expiry',
      action: 'AUTO_EXPIRED',
    });
    assert(printingPurgeRes.deferred === true, 'expireOrderFiles deferred purge for order currently in PRINTING status');
    assert(fs.existsSync(docPathB), 'Document in active physical print was protected from deletion');

    // 3. File Signature / Magic Byte verification
    const fakePdfPath = path.join(tempDir, 'fake_contract.pdf');
    fs.writeFileSync(fakePdfPath, 'This is an executable or text script, not a PDF!');
    const isFakeValid = storageService.verifyFileSignature(fakePdfPath, 'pdf');
    assert(isFakeValid === false, 'verifyFileSignature correctly rejected fake PDF lacking %PDF magic bytes');

    // Clean up temporary test files
    try {
      if (fs.existsSync(docPathB)) fs.unlinkSync(docPathB);
      if (fs.existsSync(fakePdfPath)) fs.unlinkSync(fakePdfPath);
      if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
    } catch (cleanErr) {}

    console.log('\n================================================================');
    console.log(`  AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error('Fatal error during Phase 4 workflow audit:', err);
    process.exit(1);
  }
}

runAudit();
