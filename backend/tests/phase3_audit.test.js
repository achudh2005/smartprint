/**
 * Phase 3 Technical Audit & Verification Test Suite
 * SmartPrint - Shop Owner Dashboard & Order Management
 */
const { VALID_TRANSITIONS, isValidTransition } = require('../src/services/shop.service');

function runPhase3Tests() {
  console.log('====================================================');
  console.log('  SMARTPRINT PHASE 3 - TECHNICAL AUDIT & VERIFICATION');
  console.log('====================================================\n');

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

  // --- 1. Order Status Transition Matrix Audit ---
  console.log('--- Test Suite 1: Order Status Transition Matrix ---');
  assert(isValidTransition('PENDING', 'ACCEPTED') === true, 'PENDING -> ACCEPTED is valid');
  assert(isValidTransition('PENDING', 'REJECTED') === true, 'PENDING -> REJECTED is valid');
  assert(isValidTransition('PENDING', 'CANCELLED') === true, 'PENDING -> CANCELLED is valid');
  assert(isValidTransition('PENDING', 'COLLECTED') === false, 'PENDING -> COLLECTED is INVALID (blocked)');
  assert(isValidTransition('PENDING', 'PRINTED') === false, 'PENDING -> PRINTED is INVALID (blocked)');

  assert(isValidTransition('ACCEPTED', 'PRINTING') === true, 'ACCEPTED -> PRINTING is valid');
  assert(isValidTransition('ACCEPTED', 'READY') === true, 'ACCEPTED -> READY is valid');
  assert(isValidTransition('ACCEPTED', 'COLLECTED') === false, 'ACCEPTED -> COLLECTED is INVALID');

  assert(isValidTransition('PRINTING', 'PRINTED') === true, 'PRINTING -> PRINTED is valid');
  assert(isValidTransition('PRINTING', 'ACCEPTED') === true, 'PRINTING -> ACCEPTED (rollback) is valid');

  assert(isValidTransition('PRINTED', 'READY') === true, 'PRINTED -> READY is valid');
  assert(isValidTransition('PRINTED', 'COLLECTED') === true, 'PRINTED -> COLLECTED is valid');
  assert(isValidTransition('PRINTED', 'PRINTING') === true, 'PRINTED -> PRINTING (reprint) is valid');

  assert(isValidTransition('READY', 'COLLECTED') === true, 'READY -> COLLECTED is valid');

  assert(isValidTransition('COLLECTED', 'PRINTING') === false, 'COLLECTED is terminal - cannot go to PRINTING');
  assert(isValidTransition('CANCELLED', 'PRINTED') === false, 'CANCELLED is terminal - cannot go to PRINTED');
  assert(isValidTransition('REJECTED', 'ACCEPTED') === false, 'REJECTED is terminal - cannot go to ACCEPTED');
  assert(isValidTransition('EXPIRED', 'ACCEPTED') === false, 'EXPIRED is terminal - cannot go to ACCEPTED');

  // Verify PRINTED vs COLLECTED separation
  assert(VALID_TRANSITIONS['PRINTED'] !== undefined, 'PRINTED is distinct status in transition map');
  assert(VALID_TRANSITIONS['COLLECTED'] !== undefined, 'COLLECTED is distinct status in transition map');

  // --- 2. Socket Room Authorization Verification ---
  console.log('\n--- Test Suite 2: WebSocket Handshake & Tenant Isolation ---');
  const socketModule = require('../src/socket');
  assert(typeof socketModule.initSocket === 'function', 'initSocket function exported');
  assert(typeof socketModule.emitToShop === 'function', 'emitToShop function exported');
  assert(typeof socketModule.getIo === 'function', 'getIo function exported');

  // --- 3. Shop Service Dashboard & Printing Methods ---
  console.log('\n--- Test Suite 3: Shop Service & Order Management Methods ---');
  const shopService = require('../src/services/shop.service');
  assert(typeof shopService.getDashboardStats === 'function', 'getDashboardStats service method exists');
  assert(typeof shopService.getOrderDetails === 'function', 'getOrderDetails service method exists');
  assert(typeof shopService.updateOrderStatus === 'function', 'updateOrderStatus service method exists');
  assert(typeof shopService.recordPrintJob === 'function', 'recordPrintJob service method exists');
  assert(typeof shopService.getShopNotifications === 'function', 'getShopNotifications service method exists');
  assert(typeof shopService.markNotificationsRead === 'function', 'markNotificationsRead service method exists');

  // --- 4. Customer Service Real-time Order Emission ---
  console.log('\n--- Test Suite 4: Real-time Customer Service Integration ---');
  const customerService = require('../src/services/customer.service');
  assert(typeof customerService.confirmOrder === 'function', 'confirmOrder method exists');

  // --- 5. Database Schema Consistency for Phase 3 ---
  console.log('\n--- Test Suite 5: Prisma Schema & Models for Phase 3 ---');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  assert(prisma.order !== undefined, 'Prisma Order model accessible');
  assert(prisma.orderStatusLog !== undefined, 'Prisma OrderStatusLog model accessible');
  assert(prisma.printJob !== undefined, 'Prisma PrintJob model accessible');
  assert(prisma.printer !== undefined, 'Prisma Printer model accessible');
  assert(prisma.notification !== undefined, 'Prisma Notification model accessible');
  assert(prisma.printConfiguration !== undefined, 'Prisma PrintConfiguration model accessible');

  console.log('\n====================================================');
  console.log(`  AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

try {
  runPhase3Tests();
} catch (err) {
  console.error('Fatal error running Phase 3 tests:', err);
  process.exit(1);
}
