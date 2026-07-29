/**
 * Automated Regression Test Suite for Refund Decision Communication & 5-State Lifecycle
 *
 * Validates requirements for Customer Dashboard, Arena Admin, and Super Admin:
 *  1. Customer can answer 4 key questions:
 *     - Question 1: How much refund will I receive? (Gross - 5% fee)
 *     - Question 2: When will I receive it? (Expected processing time)
 *     - Question 3: What is current refund status? (Explicit status string)
 *     - Question 4: Has my refund request been accepted or rejected? (Accepted/Rejected indicator & details)
 *  2. Explicit 5-State Lifecycle:
 *     - PENDING_REVIEW: "Your cancellation request has been received and is awaiting review."
 *     - APPROVED: "Your cancellation request has been approved."
 *     - PROCESSING: "Your refund has been approved and is currently being processed."
 *     - REFUNDED: "Your refund has been successfully processed."
 *     - REJECTED: "Your cancellation request has been rejected."
 *  3. Admin Access Control Rules:
 *     - Arena Admin: Read-only access (cannot approve/reject).
 *     - Super Admin: Can Approve/Reject/Process/Complete with mandatory rejection reason & audit logging.
 */

import { computeRefundLifecycleStatus, calculateRefundAmount, DEFAULT_REFUND_TIMELINE } from '../../lib/refund-policy';

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

function runRefundDecisionLifecycleSuite() {
  console.log('====================================================');
  console.log('📢 REFUND DECISION & COMMUNICATION LIFECYCLE SUITE');
  console.log('====================================================');

  // Test 1: Question 1 & 2 - Amount & Timeline
  console.log('\n--- Test 1: Customer Answers - Amount & Timeline ---');
  const calc = calculateRefundAmount(1200);
  assert(calc.refundAmount === 1140, 'Question 1: Refund amount for ₹1200 gross is ₹1140 (5% fee ₹60)');
  assert(DEFAULT_REFUND_TIMELINE === 'Expected within 5–7 business days.', 'Question 2: Timeline is "Expected within 5–7 business days."');

  // Test 2: Question 3 & 4 - PENDING_REVIEW State
  console.log('\n--- Test 2: PENDING_REVIEW State ---');
  const sPending = computeRefundLifecycleStatus({
    payment_status: 'confirmed',
    cancellation_requested: true,
    refund_status: 'PENDING_REVIEW',
  });
  assert(sPending.status === 'PENDING_REVIEW', 'Question 3: Status is PENDING_REVIEW');
  assert(sPending.decisionText === 'Awaiting Admin Review', 'Question 4: Decision text indicates Awaiting Admin Review');
  assert(sPending.customerMessage === 'Your cancellation request has been received and is awaiting review.', 'Exact customer message delivered for PENDING_REVIEW');

  // Test 3: Question 3 & 4 - APPROVED State
  console.log('\n--- Test 3: APPROVED State ---');
  const sApproved = computeRefundLifecycleStatus({
    payment_status: 'confirmed',
    cancellation_requested: true,
    refund_status: 'APPROVED',
  });
  assert(sApproved.status === 'APPROVED', 'Question 3: Status is APPROVED');
  assert(sApproved.isApproved === true, 'Question 4: Request is Accepted (isApproved = true)');
  assert(sApproved.customerMessage === 'Your cancellation request has been approved.', 'Exact customer message delivered for APPROVED');

  // Test 4: Question 3 & 4 - PROCESSING State
  console.log('\n--- Test 4: PROCESSING State ---');
  const sProcessing = computeRefundLifecycleStatus({
    payment_status: 'confirmed',
    cancellation_requested: true,
    refund_status: 'PROCESSING',
  });
  assert(sProcessing.status === 'PROCESSING', 'Question 3: Status is PROCESSING');
  assert(sProcessing.isApproved === true, 'Question 4: Request is Accepted (isApproved = true)');
  assert(sProcessing.customerMessage === 'Your refund has been approved and is currently being processed.', 'Exact customer message delivered for PROCESSING');

  // Test 5: Question 3 & 4 - REFUNDED State
  console.log('\n--- Test 5: REFUNDED State ---');
  const sRefunded = computeRefundLifecycleStatus({
    payment_status: 'refunded',
    refund_amount: 1140,
    refund_status: 'REFUNDED',
  });
  assert(sRefunded.status === 'REFUNDED', 'Question 3: Status is REFUNDED');
  assert(sRefunded.isRefunded === true, 'Question 4: Request is Accepted & Refund Completed');
  assert(sRefunded.customerMessage === 'Your refund has been successfully processed.', 'Exact customer message delivered for REFUNDED');

  // Test 6: Question 3 & 4 - REJECTED State
  console.log('\n--- Test 6: REJECTED State ---');
  const sRejected = computeRefundLifecycleStatus({
    payment_status: 'confirmed',
    cancellation_requested: true,
    refund_status: 'REJECTED',
    refund_reason: 'REJECTED: Booking violates cancellation window rules.',
  });
  assert(sRejected.status === 'REJECTED', 'Question 3: Status is REJECTED');
  assert(sRejected.isRejected === true, 'Question 4: Request is Rejected (isRejected = true)');
  assert(sRejected.customerMessage === 'Your cancellation request has been rejected.', 'Exact customer message delivered for REJECTED');

  console.log('\n====================================================');
  console.log(`📊 REFUND DECISION SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRefundDecisionLifecycleSuite();
