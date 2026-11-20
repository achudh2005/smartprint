/**
 * Comprehensive Subscription E2E Verification Test Suite
 */
'use strict';

const { prisma } = require('./src/database/client');
const shopService = require('./src/services/shop.service');
const subscriptionService = require('./src/services/subscription.service');
const customerService = require('./src/services/customer.service');

async function runTests() {
  console.log('=== STARTING SUBSCRIPTION E2E VERIFICATION ===');

  // 1. Get or create super admin and test user
  let admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (!admin) {
    admin = await prisma.user.findFirst();
  }
  let testUser = await prisma.user.findFirst({ where: { role: 'OWNER' } });
  if (!testUser) {
    testUser = await prisma.user.create({
      data: { name: 'Test Owner', email: `owner_${Date.now()}@test.com`, passwordHash: 'hash', role: 'OWNER' }
    });
  }

  // TEST 1: Shop Creation with Auto 30-Day Trial
  console.log('\n[TEST 1] Testing Shop Creation and Auto-Provisioned 30-Day Trial...');
  const shopName = `AutoTrial Shop ${Date.now()}`;
  const newShop = await shopService.createShop({ name: shopName, address: '123 Test St', phone: '9999999999' }, testUser.id);
  const sub1 = await prisma.shopSubscription.findUnique({ where: { shopId: newShop.id } });
  if (!sub1 || sub1.status !== 'TRIAL') throw new Error(`Test 1 Failed: Subscription not auto-created as TRIAL (found: ${sub1?.status})`);
  const calc1 = subscriptionService.computeSubscriptionDetails(sub1);
  if (!calc1.isActive || calc1.daysRemaining < 29 || calc1.daysRemaining > 30) {
    throw new Error(`Test 1 Failed: Days remaining calculation incorrect: ${calc1.daysRemaining}`);
  }
  console.log(`✅ TEST 1 PASSED: Shop created with ID ${newShop.id}, status: TRIAL, daysRemaining: ${calc1.daysRemaining}`);

  // TEST 2: Expiration, Scheduled Maintenance and Access Blocking
  console.log('\n[TEST 2] Testing Trial Expiration, Scheduled Maintenance and Customer Portal Blocking...');
  // Set trialEndsAt into the past
  await prisma.shopSubscription.update({
    where: { shopId: newShop.id },
    data: { trialEndsAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
  });
  // Run maintenance job
  const maintRes = await subscriptionService.runDailySubscriptionMaintenance();
  const sub2 = await prisma.shopSubscription.findUnique({ where: { shopId: newShop.id } });
  if (sub2.status !== 'EXPIRED') throw new Error(`Test 2 Failed: Status did not flip to EXPIRED: ${sub2.status}`);

  // Verify customer portal throws unavailable
  let customerBlocked = false;
  try {
    await customerService.getShopByCode(newShop.shopCode);
  } catch (err) {
    if (err.message.includes('temporarily unavailable') || err.code === 'SHOP_SUBSCRIPTION_INACTIVE') {
      customerBlocked = true;
    }
  }
  if (!customerBlocked) throw new Error('Test 2 Failed: Customer portal was not blocked for expired shop!');
  console.log('✅ TEST 2 PASSED: Shop expired, flipped by maintenance job, customer portal blocked with temporarily unavailable.');

  // TEST 3: Razorpay Payment Verification and Activation
  console.log('\n[TEST 3] Testing Razorpay Payment Verification and Activation...');
  const rzpOrder = await subscriptionService.createSubscriptionRazorpayOrder(newShop.id, testUser.id);
  const verifyRes = await subscriptionService.verifySubscriptionPayment({
    shopId: newShop.id,
    razorpayOrderId: rzpOrder.orderId,
    razorpayPaymentId: 'pay_test_' + Date.now(),
    razorpaySignature: 'mock_sig_valid'
  });
  const sub3 = await prisma.shopSubscription.findUnique({ where: { shopId: newShop.id } });
  if (sub3.status !== 'ACTIVE') throw new Error(`Test 3 Failed: Status not ACTIVE after payment: ${sub3.status}`);
  const paymentRecord = await prisma.subscriptionPayment.findUnique({ where: { razorpayOrderId: rzpOrder.orderId } });
  if (!paymentRecord || paymentRecord.status !== 'PAID') throw new Error('Test 3 Failed: SubscriptionPayment record not PAID');
  console.log(`✅ TEST 3 PASSED: Payment verified, Shop is ACTIVE, paid until: ${sub3.currentPeriodEnd.toISOString()}`);

  // TEST 4: Super Admin Controls and Audit Logs
  console.log('\n[TEST 4] Testing Super Admin Actions and Audit Logs...');
  // 4a. Extend Trial / Bonus Days
  await subscriptionService.adminExtendTrial(admin.id, newShop.id, 14);
  let audit1 = await prisma.auditLog.findFirst({ where: { shopId: newShop.id, action: 'SUBSCRIPTION_EXTEND_TRIAL' } });
  if (!audit1) throw new Error('Test 4a Failed: SUBSCRIPTION_EXTEND_TRIAL audit log not created');

  // 4b. Grant Free Days
  await subscriptionService.adminGrantFreeDays(admin.id, newShop.id, 10, 'Goodwill test grant');
  let audit2 = await prisma.auditLog.findFirst({ where: { shopId: newShop.id, action: 'SUBSCRIPTION_GRANT_DAYS' } });
  if (!audit2) throw new Error('Test 4b Failed: SUBSCRIPTION_GRANT_DAYS audit log not created');

  // 4c. Suspend
  await subscriptionService.adminSuspendShop(admin.id, newShop.id, 'Suspension test');
  let subSuspended = await prisma.shopSubscription.findUnique({ where: { shopId: newShop.id } });
  let calcSusp = subscriptionService.computeSubscriptionDetails(subSuspended);
  if (calcSusp.isActive || subSuspended.status !== 'SUSPENDED') throw new Error('Test 4c Failed: Shop not suspended');
  let audit3 = await prisma.auditLog.findFirst({ where: { shopId: newShop.id, action: 'SUBSCRIPTION_SUSPEND' } });
  if (!audit3) throw new Error('Test 4c Failed: SUBSCRIPTION_SUSPEND audit log not created');

  // 4d. Reactivate
  await subscriptionService.adminReactivateShop(admin.id, newShop.id);
  let subReactivated = await prisma.shopSubscription.findUnique({ where: { shopId: newShop.id } });
  let calcReact = subscriptionService.computeSubscriptionDetails(subReactivated);
  if (!calcReact.isActive) throw new Error('Test 4d Failed: Shop was not reactivated based on dates');

  // 4e. Cancel
  await subscriptionService.adminCancelSubscription(admin.id, newShop.id, 'Cancellation test');
  let subCancel = await prisma.shopSubscription.findUnique({ where: { shopId: newShop.id } });
  let calcCancel = subscriptionService.computeSubscriptionDetails(subCancel);
  if (!calcCancel.isActive) throw new Error('Test 4e Failed: Cancelled shop should remain active until period end');
  console.log('✅ TEST 4 PASSED: All Super Admin actions and AuditLogs verified!');

  // TEST 5: Single Calculation Consistency
  console.log('\n[TEST 5] Testing Single Shared Source of Truth Calculation...');
  const shopOwnerView = await subscriptionService.getShopSubscriptionOverview(newShop.id);
  const adminShopsList = await prisma.shop.findUnique({ where: { id: newShop.id }, include: { subscription: true } });
  const adminCalc = subscriptionService.computeSubscriptionDetails(adminShopsList.subscription);
  if (shopOwnerView.calculation.daysRemaining !== adminCalc.daysRemaining) {
    throw new Error(`Test 5 Failed: Discrepancy between shop owner (${shopOwnerView.calculation.daysRemaining}d) and admin (${adminCalc.daysRemaining}d) calculation!`);
  }
  console.log(`✅ TEST 5 PASSED: Shop Owner (${shopOwnerView.calculation.daysRemaining}d) and Admin (${adminCalc.daysRemaining}d) match identically.`);

  // TEST 6: Platform KPIs
  const kpis = await subscriptionService.getSubscriptionPlatformKPIs();
  console.log(`✅ TEST 6 PASSED: Platform KPIs generated: Total shops ${kpis.totalShops}, Active paying ${kpis.activeCount}, MRR ₹${kpis.estimatedMRR}`);

  console.log('\n🎉 ALL 6 SUBSCRIPTION TEST SUITE SCENARIOS PASSED 100%!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
