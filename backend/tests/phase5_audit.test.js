/**
 * SmartPrint Phase 5 Complete Audit & Verification Test Suite
 * Strictly verifies all Phase 5 modules:
 * 1. Windows Print Agent Authentication, Token Generation, & Printer Synchronization
 * 2. Direct Printing Workflow, Spooler Lifecycle, Idempotency, & Safe Retries
 * 3. Daily Business Reports & Analytics (Verified Revenue & Print Accounting)
 * 4. Super Admin RBAC, Platform KPIs, Shop Moderation, User Control, & Audit Logging
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
const printerService = require('../src/services/printer.service');
const analyticsService = require('../src/services/analytics.service');
const adminService = require('../src/services/admin.service');

async function runPhase5Audit() {
  console.log('================================================================');
  console.log('  SMARTPRINT PHASE 5: DIRECT PRINTING, ANALYTICS & ADMIN AUDIT');
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
    // -------------------------------------------------------------------------
    // SECTION 1: SETUP TEST FIXTURES
    // -------------------------------------------------------------------------
    console.log('[SECTION 1] Setting up multi-tenant test entities...');

    // 1. Create Super Admin User
    const superAdmin = await prisma.user.create({
      data: {
        email: 'superadmin@smartprint.io',
        passwordHash: 'hash_super',
        name: 'Platform Super Admin',
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });
    assert(superAdmin.role === 'SUPER_ADMIN', 'Super Admin user created with role SUPER_ADMIN');

    // 2. Create Regular Shop Owner
    const shopOwner = await prisma.user.create({
      data: {
        email: 'owner@centralprint.com',
        passwordHash: 'hash_owner',
        name: 'Central Print Owner',
        role: 'OWNER',
        isActive: true,
      },
    });

    // 3. Create Shop
    const shop = await prisma.shop.create({
      data: {
        name: 'Central Print Hub',
        slug: 'central-print-hub',
        shopCode: 'CPHUB1',
        ownerId: shopOwner.id,
        status: 'ACTIVE',
        subscriptionTier: 'STARTER',
      },
    });
    await prisma.shopUser.create({
      data: {
        shopId: shop.id,
        userId: shopOwner.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
    assert(shop.shopCode === 'CPHUB1', 'Test Shop created with code CPHUB1 and tier STARTER');

    // -------------------------------------------------------------------------
    // SECTION 2: PRINT AGENT AUTHENTICATION & PRINTER SYNCHRONIZATION
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 2] Windows Print Agent Authentication & Printer Sync...');

    // A. Generate Agent Token
    const tokenResult = await printerService.generateShopAgentToken(shop.id, shopOwner.id);
    assert(tokenResult.agentToken && tokenResult.agentToken.length >= 32, 'Generated high-entropy agent token');

    // Verify token persisted on shop
    const updatedShop = await prisma.shop.findUnique({ where: { id: shop.id } });
    assert(updatedShop.agentToken === tokenResult.agentToken, 'Agent token persisted in Shop record');

    // B. Authenticate Agent with Valid Credentials
    const authShop = await printerService.authenticateAgent(shop.shopCode, tokenResult.agentToken);
    assert(authShop && authShop.shopId === shop.id, 'Agent authenticated successfully with valid credentials');

    // C. Reject Agent with Invalid Token or Code
    let authFailed = false;
    try {
      await printerService.authenticateAgent(shop.shopCode, 'invalid_token_12345');
    } catch (err) {
      authFailed = err.statusCode === 401;
    }
    assert(authFailed, 'Agent rejected with HTTP 401 when using invalid token');

    let badCodeFailed = false;
    try {
      await printerService.authenticateAgent('NONEXISTENT_SHOP', tokenResult.agentToken);
    } catch (err) {
      badCodeFailed = err.statusCode === 401;
    }
    assert(badCodeFailed, 'Agent rejected with HTTP 401 when using unknown shop code');

    // D. Sync Installed Windows Printers from Agent
    const agentPrintersPayload = [
      {
        name: 'HP LaserJet Pro M404dn',
        model: 'HP LaserJet M404',
        connectionType: 'NETWORK',
        isColor: false,
        isDuplex: true,
        supportedPaperSizes: ['A4', 'A3', 'LETTER', 'LEGAL'],
        isDefault: true,
      },
      {
        name: 'Canon imageRUNNER ADVANCE C3530i',
        model: 'Canon C3530i',
        connectionType: 'USB',
        isColor: true,
        isDuplex: true,
        supportedPaperSizes: ['A4', 'LETTER'],
        isDefault: false,
      },
    ];

    const syncResult = await printerService.syncAgentPrinters(shop.id, agentPrintersPayload);
    assert(Array.isArray(syncResult) && syncResult.length === 2, 'Synchronized 2 Windows printers from agent payload');

    const printerData = await printerService.getShopPrinters(shop.id, shopOwner.id);
    const shopPrinters = printerData.printers;
    assert(shopPrinters.length === 2, 'Shop has exactly 2 registered printers');
    const hpPrinter = shopPrinters.find(p => p.name === 'HP LaserJet Pro M404dn');
    const canonPrinter = shopPrinters.find(p => p.name === 'Canon imageRUNNER ADVANCE C3530i');
    assert(hpPrinter && hpPrinter.isDefault === true, 'HP LaserJet marked as default printer');
    assert(canonPrinter && canonPrinter.capabilities?.color === true, 'Canon printer registered as color capable');

    // -------------------------------------------------------------------------
    // SECTION 3: DIRECT PRINTING DISPATCH & AGENT SPOOLER LIFECYCLE
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 3] Direct Printing Dispatch, Idempotency & Lifecycle...');

    // Create a mock Order & File
    const customerSession = await prisma.customerSession.create({
      data: {
        shopId: shop.id,
        sessionToken: 'session_token_phase5',
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    const testFile = await prisma.orderFile.create({
      data: {
        originalName: 'Annual_Report_2026.pdf',
        storedName: 'stored_test_doc.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 204800,
        pageCount: 15,
        storagePath: 'uploads/stored_test_doc.pdf',
        status: 'CONVERTED',
      },
    });

    const testOrder = await prisma.order.create({
      data: {
        shopId: shop.id,
        sessionId: customerSession.id,
        orderNumber: 'ORD-2026-PH5-001',
        status: 'PENDING',
        totalAmount: 45.0,
        paymentStatus: 'COMPLETED',
      },
    });

    await prisma.orderFile.update({
      where: { id: testFile.id },
      data: { orderId: testOrder.id },
    });

    // Add print configuration for the file
    await prisma.printConfiguration.create({
      data: {
        fileId: testFile.id,
        colorMode: 'BLACK_AND_WHITE',
        paperSize: 'A4',
        copies: 2,
        pagesPerSheet: 1,
        totalCalculatedPages: 15,
      },
    });

    // A. Dispatch Direct Print Job
    const idempotencyKey = `direct_print_${testOrder.id}_${testFile.id}_${Date.now()}`;
    const dispatchRes = await printerService.dispatchDirectPrint(
      shop.id,
      shopOwner.id,
      {
        orderId: testOrder.id,
        fileId: testFile.id,
        printerId: hpPrinter.id,
        idempotencyKey,
      }
    );

    const printJob = dispatchRes.jobs[0];
    assert(printJob && printJob.status === 'QUEUED', 'Direct print job created with initial status QUEUED');
    assert(printJob.printerId === hpPrinter.id, 'Direct print job linked to target printer');
    assert(printJob.jobTicket.copies === 2, 'Job ticket settings stored in printJob');

    // B. Verify Idempotency Protection
    const duplicateRes = await printerService.dispatchDirectPrint(
      shop.id,
      shopOwner.id,
      {
        orderId: testOrder.id,
        fileId: testFile.id,
        printerId: hpPrinter.id,
        idempotencyKey,
      }
    );
    const duplicateJob = duplicateRes.jobs[0];
    assert(duplicateJob.id === printJob.id, 'Idempotency key returned existing print job without creating duplicate');

    // C. Agent Polls Pending Jobs
    const pendingJobs = await printerService.getAgentPendingJobs(shop.id);
    assert(pendingJobs.length >= 1 && pendingJobs.some(j => j.id === printJob.id), 'Agent successfully polls pending print job');

    // D. Spooler Lifecycle Transitions
    // Transition 1: QUEUED -> DOWNLOADED
    const downloadedJob = await printerService.updateAgentJobStatus(shop.id, printJob.id, 'DOWNLOADED');
    assert(downloadedJob.status === 'DOWNLOADED', 'Job status updated to DOWNLOADED by agent');

    // Transition 2: DOWNLOADED -> SUBMITTED_TO_OS
    const submittedJob = await printerService.updateAgentJobStatus(shop.id, printJob.id, 'SUBMITTED_TO_OS', {
      spoolJobId: 1042,
    });
    assert(submittedJob.status === 'SUBMITTED_TO_OS', 'Job status updated to SUBMITTED_TO_OS');

    // Transition 3: SUBMITTED_TO_OS -> DRIVER_COMPLETED
    const driverCompletedJob = await printerService.updateAgentJobStatus(shop.id, printJob.id, 'DRIVER_COMPLETED');
    assert(driverCompletedJob.status === 'DRIVER_COMPLETED', 'Job status updated to DRIVER_COMPLETED');

    // Transition 4: DRIVER_COMPLETED -> MANUALLY_CONFIRMED
    const manuallyConfirmedJob = await printerService.updateAgentJobStatus(shop.id, printJob.id, 'MANUALLY_CONFIRMED');
    assert(manuallyConfirmedJob.status === 'MANUALLY_CONFIRMED', 'Job status updated to MANUALLY_CONFIRMED');

    // E. Test Job Failure and Retry Workflow
    const failedDispatch = await printerService.dispatchDirectPrint(
      shop.id,
      shopOwner.id,
      {
        orderId: testOrder.id,
        fileId: testFile.id,
        printerId: hpPrinter.id,
      }
    );
    const failedJob = failedDispatch.jobs[0];

    await printerService.updateAgentJobStatus(shop.id, failedJob.id, 'FAILED', {
      error: 'Paper jam in tray 2',
    });
    const failedRecord = await prisma.printJob.findUnique({ where: { id: failedJob.id } });
    assert(failedRecord.status === 'FAILED', 'Print job successfully marked as FAILED with error notes');

    // Safe Retry
    const retriedJob = await printerService.retryPrintJob(shop.id, shopOwner.id, failedJob.id);
    assert(retriedJob.id !== failedJob.id, 'Retry generated a new distinct print job record');
    assert(retriedJob.attemptNumber > failedJob.attemptNumber, 'Retry incremented attemptNumber');
    assert(retriedJob.status === 'QUEUED', 'Retried job placed back in QUEUED state for agent pickup');

    // -------------------------------------------------------------------------
    // SECTION 4: DAILY BUSINESS REPORTS & REVENUE ANALYTICS
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 4] Business Reports & Revenue Accounting Verification...');

    // Create financial records:
    // Online verified payment: 100
    await prisma.payment.create({
      data: {
        orderId: testOrder.id,
        amount: 100.0,
        status: 'SUCCESS',
        method: 'ONLINE_RAZORPAY',
        transactionRef: 'pay_test_online_100',
      },
    });

    // Counter verified payment: 50
    await prisma.payment.create({
      data: {
        orderId: testOrder.id,
        amount: 50.0,
        status: 'COUNTER_PAYMENT_COLLECTED',
        method: 'COUNTER_CASH',
        transactionRef: 'cash_ref_50',
      },
    });

    // Unpaid/Pending payment: 500 (MUST NOT be counted in revenue!)
    await prisma.payment.create({
      data: {
        orderId: testOrder.id,
        amount: 500.0,
        status: 'PENDING',
        method: 'ONLINE_RAZORPAY',
        transactionRef: 'pay_pending_500',
      },
    });

    // Fetch Shop Analytics for 'today'
    const analytics = await analyticsService.getShopAnalytics(shop.id, shopOwner.id, { range: 'today' });
    assert(analytics && analytics.kpis, 'Analytics report generated successfully');

    // Verify strict revenue: 100 + 50 = 150 (ignoring 500 pending)
    assert(analytics.kpis.period.totalRevenue === 150.0, `Revenue strictly accounts for verified payments (Expected: 150.0, Actual: ${analytics.kpis.period.totalRevenue})`);
    assert(analytics.kpis.period.onlineRevenue === 100.0, `Online revenue correctly separated (Expected: 100.0, Actual: ${analytics.kpis.period.onlineRevenue})`);
    assert(analytics.kpis.period.counterRevenue === 50.0, `Counter revenue correctly separated (Expected: 50.0, Actual: ${analytics.kpis.period.counterRevenue})`);

    // Verify pages printed counted strictly from completed print jobs
    assert(analytics.kpis.period.totalPagesPrinted >= 15, `Pages printed tally verified completed print jobs (Count: ${analytics.kpis.period.totalPagesPrinted})`);

    // Verify CSV Report Generation
    const csvExport = await analyticsService.generateCsvReport(shop.id, shopOwner.id, { range: 'today' });
    assert(typeof csvExport === 'string' && csvExport.includes('SMARTPRINT BUSINESS REPORT'), 'CSV export generated with proper headers');
    assert(csvExport.includes('150'), 'CSV export contains exact verified revenue figure');

    // -------------------------------------------------------------------------
    // SECTION 5: SUPER ADMIN RBAC, MODERATION & SECURITY AUDIT LOGGING
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 5] Super Admin RBAC, Moderation & Audit Logging...');

    // A. Role-Based Access Control Verification
    let nonAdminBlocked = false;
    try {
      await adminService.assertSuperAdmin(shopOwner.id);
    } catch (err) {
      nonAdminBlocked = err.statusCode === 403;
    }
    assert(nonAdminBlocked, 'Regular shop OWNER strictly blocked from Super Admin actions with HTTP 403');

    let adminAllowed = false;
    try {
      const verifiedAdmin = await adminService.assertSuperAdmin(superAdmin.id);
      adminAllowed = verifiedAdmin.role === 'SUPER_ADMIN';
    } catch (err) {
      adminAllowed = false;
    }
    assert(adminAllowed, 'SUPER_ADMIN user successfully passes authorization guard');

    // B. Platform Overview KPIs
    const overview = await adminService.getPlatformOverview(superAdmin.id);
    assert(overview.kpis.totalShops >= 1, 'Platform overview correctly reports total registered shops');
    assert(overview.kpis.totalUsers >= 2, 'Platform overview correctly reports total platform users');
    assert(overview.kpis.totalOrders >= 1, 'Platform overview correctly reports platform orders');

    // C. Shop Moderation (Suspension & Activation)
    const suspendedShop = await adminService.updateShopStatus(superAdmin.id, shop.id, {
      status: 'SUSPENDED',
      reason: 'Terms of service compliance check',
    });
    assert(suspendedShop.status === 'SUSPENDED', 'Super Admin successfully suspended shop');

    // Verify audit log generated for shop suspension
    const suspensionLog = inMemoryPrisma.auditLogs.find(
      l => l.action === 'SHOP_SUSPENDED' && l.shopId === shop.id
    );
    assert(suspensionLog !== undefined, 'SHOP_SUSPENDED action recorded in immutable security audit log');

    // Reactivate Shop and Upgrade Subscription Tier
    const reactivatedShop = await adminService.updateShopStatus(superAdmin.id, shop.id, {
      status: 'ACTIVE',
      subscriptionTier: 'ENTERPRISE',
    });
    assert(reactivatedShop.status === 'ACTIVE' && reactivatedShop.subscriptionTier === 'ENTERPRISE', 'Super Admin upgraded shop to ENTERPRISE tier and set status to ACTIVE');

    // D. User Management & Moderation
    const updatedUser = await adminService.updateUser(superAdmin.id, shopOwner.id, {
      role: 'MANAGER',
      status: 'SUSPENDED',
    });
    assert(updatedUser.role === 'MANAGER' && updatedUser.status === 'SUSPENDED', 'Super Admin modified user role and status');

    const userModLog = inMemoryPrisma.auditLogs.find(
      l => l.action === 'USER_UPDATED' && l.details?.targetUserId === shopOwner.id
    );
    assert(userModLog !== undefined, 'USER_UPDATED action recorded in security audit log');

    // E. Retrieve Audit Logs via Service
    const auditRes = await adminService.getAuditLogs(superAdmin.id);
    assert(Array.isArray(auditRes.logs) && auditRes.logs.length >= 2, 'Audit log viewer successfully lists platform security events');

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`  PHASE 5 AUDIT COMPLETED: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('\n[FATAL AUDIT ERROR]:', err);
    process.exit(1);
  }
}

runPhase5Audit();
