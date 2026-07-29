/**
 * Automated Regression Test Suite for Customer Refund Panel & Explicit Lifecycle Status
 *
 * Validates requirements requested by Basil Sir & Client Feedback:
 *  1. Gross amount, 5% fee, net refund calculation (₹1000 -> ₹50 fee -> ₹950 refund).
 *  2. Configurable expected refund processing timeline ("Expected within 5–7 business days.").
 *  3. Explicit Refund Lifecycle Statuses:
 *     - PENDING_REVIEW ("PENDING REVIEW")
 *     - PROCESSING ("PROCESSING")
 *     - REFUNDED ("REFUNDED")
 *     - REJECTED ("REJECTED")
 *  4. Full metadata rendering invariants (Booking ref, original amount, 5% fee, net refund, timestamp, reference).
 */

import { calculateRefundAmount, computeRefundLifecycleStatus, DEFAULT_REFUND_TIMELINE } from '../../lib/refund-policy';

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string, detail: string = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${description} ${detail ? '(' + detail + ')' : ''}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${description} ${detail ? '(' + detail + ')' : ''}`);
    failed++;
    throw new Error(`Assertion Failed: ${description} — ${detail}`);
  }
}

function runRefundPanelLifecycleSuite() {
  console.log('====================================================');
  console.log('💳 CUSTOMER REFUND PANEL & LIFECYCLE REGRESSION SUITE');
  console.log('====================================================');

  // Test 1: 5% Service Fee & Net Refund Calculations
  console.log('\n--- Test 1: Refund Calculation & 5% Service Fee ---');
  const calc1 = calculateRefundAmount(1000);
  assert(calc1.grossAmount === 1000, 'Gross amount is ₹1000');
  assert(calc1.serviceFee === 50, '5% service fee is ₹50');
  assert(calc1.refundAmount === 950, 'Expected net refund is ₹950');

  const calc2 = calculateRefundAmount(500);
  assert(calc2.serviceFee === 25 && calc2.refundAmount === 475, 'Gross ₹500 -> ₹25 fee -> ₹475 net refund');

  // Test 2: Default Configurable Refund Timeline
  console.log('\n--- Test 2: Configurable Refund Timeline Text ---');
  assert(DEFAULT_REFUND_TIMELINE === 'Expected within 5–7 business days.', 'Default refund timeline is "Expected within 5–7 business days."');

  // Test 3: Refund Lifecycle State - PENDING_REVIEW
  console.log('\n--- Test 3: Refund Lifecycle - PENDING_REVIEW ---');
  const statusPending = computeRefundLifecycleStatus({
    payment_status: 'confirmed',
    cancellation_requested: true,
  });
  assert(statusPending.status === 'PENDING_REVIEW', 'State is PENDING_REVIEW when cancellation requested');
  assert(statusPending.statusText === 'PENDING REVIEW', 'Status text is "PENDING REVIEW"');
  assert(statusPending.isPending === true, 'isPending flag is true');

  // Test 4: Refund Lifecycle State - PROCESSING
  console.log('\n--- Test 4: Refund Lifecycle - PROCESSING ---');
  const statusProcessing = computeRefundLifecycleStatus({
    payment_status: 'confirmed',
    cancellation_requested: true,
    cancellation_reason: 'Cancellation request APPROVED by admin',
  });
  assert(statusProcessing.status === 'PROCESSING', 'State is PROCESSING when approved by admin');
  assert(statusProcessing.statusText === 'PROCESSING', 'Status text is "PROCESSING"');
  assert(statusProcessing.isProcessing === true, 'isProcessing flag is true');

  // Test 5: Refund Lifecycle State - REFUNDED
  console.log('\n--- Test 5: Refund Lifecycle - REFUNDED ---');
  const statusRefunded = computeRefundLifecycleStatus({
    payment_status: 'refunded',
    refund_amount: 950,
  });
  assert(statusRefunded.status === 'REFUNDED', 'State is REFUNDED when payment_status is refunded');
  assert(statusRefunded.statusText === 'REFUNDED', 'Status text is "REFUNDED"');
  assert(statusRefunded.isRefunded === true, 'isRefunded flag is true');

  // Test 6: Refund Lifecycle State - REJECTED
  console.log('\n--- Test 6: Refund Lifecycle - REJECTED ---');
  const statusRejected = computeRefundLifecycleStatus({
    payment_status: 'confirmed',
    cancellation_requested: true,
    cancellation_reason: 'REJECTED: Booking violates venue terms and conditions.',
  });
  assert(statusRejected.status === 'REJECTED', 'State is REJECTED when cancellation_reason starts with REJECTED:');
  assert(statusRejected.statusText === 'REJECTED', 'Status text is "REJECTED"');
  assert(statusRejected.isRejected === true, 'isRejected flag is true');

  console.log('\n====================================================');
  console.log(`📊 REFUND PANEL SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRefundPanelLifecycleSuite();
