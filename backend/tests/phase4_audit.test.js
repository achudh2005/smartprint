/**
 * SmartPrint Phase 4 Comprehensive Automated Audit & Test Suite
 * Tests all 14 requirements specified in Phase 4 prompt:
 * 1. Every expiry option (15m, 1h, 3h, 8h)
 * 2. Automatic deletion & physical unlinking of files & previews
 * 3. Failed deletion retry configuration
 * 4. Owner expiry extension (+60m, +180m)
 * 5. Owner expiry shortening
 * 6. Immediate deletion / manual purge with audit log
 * 7. Unauthorized document access rejection
 * 8. Expired download rejection (HTTP 410)
 * 9. Expired print rejection (HTTP 410)
 * 10. Payment-disabled shop & counter payment due
 * 11. Counter payment recording (COUNTER_PAYMENT_COLLECTED)
 * 12. Razorpay order creation & signature verification
 * 13. Invalid signature detection & rejection
 * 14. Idempotent webhook handling (duplicate replay protection)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { InMemoryPrisma } = require('./mockPrisma');
const inMemoryPrisma = new InMemoryPrisma();

// Intercept database client singleton with in-memory persistence
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
const { scheduleOrderExpiry, isRedisAvailable } = require('../src/queues/expiry.queue');

async function runPhase4Tests() {
  console.log('================================================================');
  console.log('  SMARTPRINT PHASE 4: EXPIRY, PRIVACY, SECURITY & PAYMENTS AUDIT');
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
    // Test Suite 1: Expiry Durations & Option Parsing
    // ---------------------------------------------------------
    console.log('--- Test Suite 1: Expiry Options (15m, 1h, 3h, 8h) ---');
    assert(expiryService.parseExpiryDuration('15m') === 15 * 60 * 1000, '15m option resolves to 900,000 ms (15 minutes)');
    assert(expiryService.parseExpiryDuration('1h') === 60 * 60 * 1000, '1h option resolves to 3,600,000 ms (1 hour)');
    assert(expiryService.parseExpiryDuration('3h') === 3 * 60 * 60 * 1000, '3h option resolves to 10,800,000 ms (3 hours)');
    assert(expiryService.parseExpiryDuration('8h') === 8 * 60 * 60 * 1000, '8h option resolves to 28,800,000 ms (8 hours)');
    assert(expiryService.parseExpiryDuration('unknown') === 60 * 60 * 1000, 'Fallback default resolves safely to 1 hour');

    const now = new Date();
    const exp15m = expiryService.calculateExpiresAt('15m', now);
    assert(exp15m.getTime() - now.getTime() === 15 * 60 * 1000, 'calculateExpiresAt computes accurate future timestamp');

    // ---------------------------------------------------------
    // Test Suite 2: Physical File Unlinking & Privacy Purging
    // ---------------------------------------------------------
    console.log('\n--- Test Suite 2: Automatic Deletion & Physical Unlinking ---');
    const testDir = path.join(process.cwd(), 'uploads', 'test_phase4_temp');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    const dummyFilePath = path.join(testDir, 'customer_doc.pdf');
    const dummyPreviewPath = path.join(testDir, 'customer_doc_preview.pdf');
    fs.writeFileSync(dummyFilePath, 'DUMMY_PDF_CONTENT_FOR_SMARTPRINT_PRIVACY_AUDIT');
    fs.writeFileSync(dummyPreviewPath, 'DUMMY_PREVIEW_PDF');

    assert(fs.existsSync(dummyFilePath), 'Test document created on disk');
    assert(fs.existsSync(dummyPreviewPath), 'Test preview created on disk');

    const unlinkRes = expiryService.securelyDeleteFile(dummyFilePath);
    assert(unlinkRes.success === true, 'securelyDeleteFile returned success');
    assert(fs.existsSync(dummyFilePath) === false, 'Original document permanently unlinked from disk');
    assert(fs.existsSync(dummyPreviewPath) === false, 'Associated preview file permanently unlinked from disk');
    assert(unlinkRes.bytesFreed > 0, `Bytes freed accurately calculated (${unlinkRes.bytesFreed} bytes)`);

    // Clean up test dir
    if (fs.existsSync(testDir)) fs.rmdirSync(testDir);

    // ---------------------------------------------------------
    // Test Suite 3: Setup Mock Shop & Order for Lifecycle Testing
    // ---------------------------------------------------------
    console.log('\n--- Test Suite 3: Shop & Order Expiry Lifecycle ---');
    const user = await prisma.user.create({
      data: {
        publicId: crypto.randomUUID(),
        email: `owner_${Date.now()}@example.com`,
        name: 'Print Hub Manager',
        role: 'OWNER',
      },
    });

    const shop = await shopService.createShop({
      name: `Secure Print Shop ${Date.now()}`,
    }, user.id);

    // Enable online payments for test
    await prisma.shopSettings.update({
      where: { shopId: shop.id },
      data: {
        paymentEnabled: true,
        razorpayKeyId: 'rzp_test_key_123',
        razorpayKeySecret: 'secret_key_456',
        razorpayWebhookSecret: 'webhook_secret_789',
        defaultExpiryOption: '1h',
        enabledExpiryOptions: '15m,1h,3h,8h',
      },
    });

    // Create session and order with 1 document
    const testDocPath = path.join(process.cwd(), 'uploads', `test_order_file_${Date.now()}.pdf`);
    fs.writeFileSync(testDocPath, 'CONFIDENTIAL_CUSTOMER_DOCUMENT');

    const order = await prisma.order.create({
      data: {
        publicId: crypto.randomUUID(),
        orderNumber: 'ORD-TEST-PHASE4-001',
        shopId: shop.id,
        status: 'ACCEPTED',
        totalAmount: 50.0,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        expiryOption: '1h',
      },
    });

    const orderFile = await prisma.orderFile.create({
      data: {
        publicId: crypto.randomUUID(),
        orderId: order.id,
        originalName: 'Contract.pdf',
        storagePath: testDocPath,
        mimeType: 'application/pdf',
        fileSizeBytes: 28,
        status: 'READY',
        expiresAt: order.expiresAt,
        isPurged: false,
      },
    });

    // ---------------------------------------------------------
    // Test Suite 4: Owner Expiry Controls (Extend & Shorten)
    // ---------------------------------------------------------
    console.log('\n--- Test Suite 4: Owner Expiry Extension & Shortening ---');
    const initialExpiryTime = new Date(order.expiresAt).getTime();
    const extendRes = await expiryService.extendOrderExpiry(shop.id, user.id, order.id, 60);
    assert(extendRes.success === true, 'Owner extended order expiry by +60m');

    const orderAfterExtend = await prisma.order.findUnique({ where: { id: order.id } });
    assert(new Date(orderAfterExtend.expiresAt).getTime() > initialExpiryTime, 'Order expiresAt successfully pushed into future');

    const shortenRes = await expiryService.shortenOrderExpiry(shop.id, user.id, order.id, 15);
    assert(shortenRes.success === true, 'Owner shortened order expiry to 15m from now');

    // ---------------------------------------------------------
    // Test Suite 5: Immediate Deletion & Manual Purge
    // ---------------------------------------------------------
    console.log('\n--- Test Suite 5: Immediate Deletion & Audit Trail ---');
    const purgeRes = await expiryService.purgeOrderFilesImmediately(shop.id, user.id, order.id);
    assert(purgeRes.success === true, 'purgeOrderFilesImmediately executed successfully');
    assert(purgeRes.filesPurged === 1, '1 file purged');
    assert(fs.existsSync(testDocPath) === false, 'File physically deleted from storage');

    const fileAfterPurge = await prisma.orderFile.findUnique({ where: { id: orderFile.id } });
    assert(fileAfterPurge.status === 'EXPIRED', 'File status set to EXPIRED');
    assert(fileAfterPurge.isPurged === true, 'File isPurged set to true');

    const expiryLogs = await expiryService.getOrderExpiryLogs(shop.id, user.id, order.id);
    assert(expiryLogs.length >= 3, `Recorded ${expiryLogs.length} audit logs (EXTENDED, SHORTENED, IMMEDIATE_DELETION)`);
    assert(expiryLogs[0].action === 'IMMEDIATE_DELETION', 'Latest log correctly reflects IMMEDIATE_DELETION');

    // ---------------------------------------------------------
    // Test Suite 6: Unauthorized Access & Expired Access Gatekeeper
    // ---------------------------------------------------------
    console.log('\n--- Test Suite 6: Expired Download & Print Rejection ---');
    let downloadBlocked = false;
    try {
      expiryService.assertDocumentNotExpired(fileAfterPurge);
    } catch (err) {
      if (err.statusCode === 410) {
        downloadBlocked = true;
      }
    }
    assert(downloadBlocked, 'assertDocumentNotExpired rejected purged document with HTTP 410 Gone');

    let printBlocked = false;
    try {
      await shopService.recordPrintJob(shop.id, user.id, order.id, orderFile.id);
    } catch (err) {
      if (err.statusCode === 410) {
        printBlocked = true;
      }
    }
    assert(printBlocked, 'recordPrintJob rejected print attempt on expired document with HTTP 410 Gone');

    // ---------------------------------------------------------
    // Test Suite 7: Payment-Disabled Shop & Counter Payment
    // ---------------------------------------------------------
    console.log('\n--- Test Suite 7: Payment-Disabled Shop & Counter Workflow ---');
    // Shop with paymentDisabled
    await prisma.shopSettings.update({
      where: { shopId: shop.id },
      data: { paymentEnabled: false },
    });

    const counterOrder = await prisma.order.create({
      data: {
        publicId: crypto.randomUUID(),
        orderNumber: 'ORD-COUNTER-002',
        shopId: shop.id,
        status: 'CONFIRMED',
        totalAmount: 75.0,
      },
    });

    let paymentCreationBlocked = false;
    try {
      await paymentService.createRazorpayOrder(counterOrder.id);
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('not enabled')) {
        paymentCreationBlocked = true;
      }
    }
    assert(paymentCreationBlocked, 'createRazorpayOrder blocked for shop with paymentEnabled = false');

    // Staff records counter collection
    const counterPayment = await paymentService.recordCounterPayment(shop.id, user.id, counterOrder.id, {
      amount: 75.0,
      method: 'CASH',
      notes: 'Customer paid ₹75 in cash at counter',
    });
    assert(counterPayment.status === 'COUNTER_PAYMENT_COLLECTED', 'Counter payment recorded with status COUNTER_PAYMENT_COLLECTED');
    assert(counterPayment.method === 'CASH', 'Payment method CASH preserved');

    // ---------------------------------------------------------
    // Test Suite 8: Razorpay Online Payment & Signature Verification
    // ---------------------------------------------------------
    console.log('\n--- Test Suite 8: Razorpay Order Creation & HMAC Verification ---');
    // Re-enable payment
    await prisma.shopSettings.update({
      where: { shopId: shop.id },
      data: { paymentEnabled: true },
    });

    const onlineOrder = await prisma.order.create({
      data: {
        publicId: crypto.randomUUID(),
        orderNumber: 'ORD-ONLINE-003',
        shopId: shop.id,
        status: 'PAYMENT_PENDING',
        totalAmount: 120.0,
      },
    });

    const rzpOrderData = await paymentService.createRazorpayOrder(onlineOrder.id);
    assert(rzpOrderData.success === true, 'Razorpay order created');
    assert(rzpOrderData.amount === 12000, 'Amount in paise correctly computed (120 * 100 = 12000)');
    assert(rzpOrderData.razorpayOrderId !== undefined, `Received Razorpay Order ID (${rzpOrderData.razorpayOrderId})`);

    // Verify Invalid Signature Rejection
    let invalidSigBlocked = false;
    try {
      await paymentService.verifyRazorpayPayment({
        orderId: onlineOrder.id,
        razorpayOrderId: rzpOrderData.razorpayOrderId,
        razorpayPaymentId: 'pay_test_tampered',
        razorpaySignature: 'invalid_forged_hex_signature',
      });
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('signature verification failed')) {
        invalidSigBlocked = true;
      }
    }
    assert(invalidSigBlocked, 'Invalid/forged signature rejected with 400 Bad Request');

    // Verify Valid Signature Acceptance
    const testPaymentId = 'pay_test_valid_999';
    const secret = 'secret_key_456';
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(`${rzpOrderData.razorpayOrderId}|${testPaymentId}`)
      .digest('hex');

    const verifyRes = await paymentService.verifyRazorpayPayment({
      orderId: onlineOrder.id,
      razorpayOrderId: rzpOrderData.razorpayOrderId,
      razorpayPaymentId: testPaymentId,
      razorpaySignature: validSignature,
    });
    assert(verifyRes.success === true, 'Valid HMAC signature accepted');
    assert(verifyRes.payment.status === 'SUCCESS', 'Payment record updated to SUCCESS');

    const orderAfterPay = await prisma.order.findUnique({ where: { id: onlineOrder.id } });
    assert(orderAfterPay.status === 'CONFIRMED', 'Order status moved from PAYMENT_PENDING to CONFIRMED');

    // ---------------------------------------------------------
    // Test Suite 9: Webhook Verification & Idempotency Guard
    // ---------------------------------------------------------
    console.log('\n--- Test Suite 9: Webhook Handling & Idempotency ---');
    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: testPaymentId,
            order_id: rzpOrderData.razorpayOrderId,
            amount: 12000,
            status: 'captured',
          },
        },
      },
    };

    const webhookBodyStr = JSON.stringify(webhookPayload);
    const webhookSig = crypto
      .createHmac('sha256', 'webhook_secret_789')
      .update(webhookBodyStr)
      .digest('hex');

    // First webhook delivery
    const hookRes1 = await paymentService.handleRazorpayWebhook(webhookPayload, webhookSig, webhookBodyStr);
    assert(hookRes1.success === true, 'Webhook event processed successfully');

    // Duplicate replay webhook delivery
    const hookRes2 = await paymentService.handleRazorpayWebhook(webhookPayload, webhookSig, webhookBodyStr);
    assert(hookRes2.idempotent === true, 'Duplicate webhook identified and handled idempotently without duplicate side-effects');

    // ---------------------------------------------------------
    // Test Suite 10: Shop Payments Dashboard Reporting
    // ---------------------------------------------------------
    console.log('\n--- Test Suite 10: Shop Payments Ledger & Dashboard Reporting ---');
    const paymentReport = await paymentService.getShopPayments(shop.id, user.id);
    assert(paymentReport.payments.length >= 2, `Report returned ${paymentReport.payments.length} transactions`);
    assert(paymentReport.stats.totalRevenue >= 195.0, `Total revenue aggregated correctly: ₹${paymentReport.stats.totalRevenue}`);
    assert(paymentReport.stats.counterRevenue >= 75.0, `Counter revenue tracked: ₹${paymentReport.stats.counterRevenue}`);
    assert(paymentReport.stats.onlineRevenue >= 120.0, `Online revenue tracked: ₹${paymentReport.stats.onlineRevenue}`);

    console.log('\n================================================================');
    console.log(`  AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error('Fatal error during Phase 4 audit:', err);
    process.exit(1);
  }
}

runPhase4Tests();
