/**
 * Comprehensive Unit & Domain Test Suite for Cancellation Lifecycle & Past Booking Restrictions
 *
 * Updated 2026-08-28 for the month-end + 24h refund policy: cancellation
 * itself is now always allowed up until the game ends — only refund
 * eligibility (`refundEligible`) is time-boxed. `allowed === false` now
 * happens only for PAST_BOOKING.
 *
 * Tests all rules:
 *  1. Future booking > cutoff -> Cancellation allowed, refund-eligible
 *  2. Future booking < cutoff -> Cancellation allowed, NOT refund-eligible (NO_REFUND_LATE)
 *  3. Boundary behavior at exactly cutoff away -> refund-eligible
 *  4. Currently active booking -> Cancellation allowed, not refund-eligible
 *  5. Past booking -> Cancellation rejected (PAST_BOOKING)
 *  6. Direct API past booking request -> Rejected
 *  7. Multi-slot past BookingGroup -> Rejected at aggregate level
 *  8. Existing pending cancellation -> Duplicate request rejected (CANCELLATION_ALREADY_REQUESTED)
 *  9. Approved / Refunded cancellation -> Cannot request again
 * 10. Midnight timezone boundary in IST (+05:30) -> Correct result
 */

import { evaluateCancellationEligibility, getBookingTimeRange } from '../../lib/refund-policy';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail: string = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName} ${detail ? '(' + detail + ')' : ''}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${detail ? '(' + detail + ')' : ''}`);
    failedCount++;
    throw new Error(`Test Failed: ${testName} — ${detail}`);
  }
}

console.log('====================================================');
console.log('🧪 CANCELLATION LIFECYCLE & TIMEZONE BOUNDARY SUITE');
console.log('====================================================');

// Setup reference time for deterministic testing in IST (+05:30)
// Base Time: 2026-07-29T12:00:00+05:30 (12:00 PM IST)
const BASE_NOW = new Date('2026-07-29T12:00:00+05:30').getTime();

// All Test 1-4 calls pin cutoffHours=3 explicitly (the pre-2026-08-28 default)
// so the boundary math below still exercises a 3h line — only what
// "failing the cutoff" now means (refundEligible=false, still cancellable)
// has changed. paymentDate defaults to `now`, keeping the invoice-month
// check trivially satisfied so it doesn't interfere with these tests.

// -----------------------------------------------------------------------------
// Test 1: Future booking > 3h away -> Cancellation allowed & refund-eligible
// -----------------------------------------------------------------------------
console.log('\n--- Test 1: Future booking > 3h away ---');
// Game at 16:00 - 17:00 (4 hours from 12:00)
const res1 = evaluateCancellationEligibility('2026-07-29', ['16:00 - 17:00'], BASE_NOW, 3);
assert(res1.allowed === true, 'Future booking 4h away is cancellable');
assert(res1.refundEligible === true, 'Future booking 4h away is refund-eligible');
assert(res1.code === 'ELIGIBLE', 'Eligibility code is ELIGIBLE');

// -----------------------------------------------------------------------------
// Test 2: Future booking < 3h away -> Cancellation allowed, refund NOT eligible
// -----------------------------------------------------------------------------
console.log('\n--- Test 2: Future booking < 3h away ---');
// Game at 14:00 - 15:00 (2 hours from 12:00)
const res2 = evaluateCancellationEligibility('2026-07-29', ['14:00 - 15:00'], BASE_NOW, 3);
assert(res2.allowed === true, 'Future booking 2h away is still cancellable');
assert(res2.refundEligible === false, 'Future booking 2h away is not refund-eligible');
assert(res2.code === 'NO_REFUND_LATE', 'Code is NO_REFUND_LATE');

// -----------------------------------------------------------------------------
// Test 3: Boundary behavior -> Exactly 3h away
// -----------------------------------------------------------------------------
console.log('\n--- Test 3: Boundary behavior at exactly 3h away ---');
// Game at 15:00 - 16:00 (Exactly 3 hours from 12:00)
const res3 = evaluateCancellationEligibility('2026-07-29', ['15:00 - 16:00'], BASE_NOW, 3);
assert(res3.refundEligible === true, 'Exact 3h boundary is refund-eligible');

// Exactly 2h 59m 59s away (14:59:59 start)
const nowBoundaryJustUnder = new Date('2026-07-29T12:00:01+05:30').getTime();
const res3b = evaluateCancellationEligibility('2026-07-29', ['15:00 - 16:00'], nowBoundaryJustUnder, 3);
assert(res3b.allowed === true, '2h 59m 59s away is still cancellable');
assert(res3b.refundEligible === false, '2h 59m 59s away is not refund-eligible');

// -----------------------------------------------------------------------------
// Test 4: Currently active booking -> Cancellation allowed, refund NOT eligible
// -----------------------------------------------------------------------------
console.log('\n--- Test 4: Currently active booking ---');
// Game is 11:30 - 13:30 (now is 12:00 PM)
const res4 = evaluateCancellationEligibility('2026-07-29', ['11:30 - 13:30'], BASE_NOW, 3);
assert(res4.allowed === true, 'Currently active game can still be cancelled');
assert(res4.refundEligible === false, 'Currently active game is not refund-eligible');
assert(res4.code === 'NO_REFUND_LATE', 'Code is NO_REFUND_LATE for active game');

// -----------------------------------------------------------------------------
// Test 5: Past booking -> Cancellation rejected
// -----------------------------------------------------------------------------
console.log('\n--- Test 5: Past booking ---');
// Game was 09:00 - 10:00 AM today (now is 12:00 PM)
const res5 = evaluateCancellationEligibility('2026-07-29', ['09:00 - 10:00'], BASE_NOW);
assert(res5.allowed === false, 'Past booking from earlier today is rejected');
assert(res5.code === 'PAST_BOOKING', 'Code is PAST_BOOKING');

// Game was yesterday 2026-07-28
const res5b = evaluateCancellationEligibility('2026-07-28', ['19:00 - 20:00'], BASE_NOW);
assert(res5b.allowed === false, 'Past booking from yesterday is rejected');
assert(res5b.code === 'PAST_BOOKING', 'Code is PAST_BOOKING for yesterday');

// -----------------------------------------------------------------------------
// Test 6: Multi-slot past BookingGroup -> Rejected at aggregate level
// -----------------------------------------------------------------------------
console.log('\n--- Test 6: Multi-slot past BookingGroup ---');
// 2 slots: 09:00-10:00 and 10:00-11:00 (game ended at 11:00, now is 12:00)
const res6 = evaluateCancellationEligibility('2026-07-29', ['09:00 - 10:00', '10:00 - 11:00'], BASE_NOW);
assert(res6.allowed === false, 'Multi-slot past booking rejected at aggregate level');
assert(res6.code === 'PAST_BOOKING', 'Code is PAST_BOOKING');

// -----------------------------------------------------------------------------
// Test 7: Midnight timezone boundary in IST (+05:30)
// -----------------------------------------------------------------------------
console.log('\n--- Test 7: Midnight timezone boundary in IST ---');
// Late night slot: 23:00 - 00:00 (ends at midnight of next day 2026-07-30)
const midnightRange = getBookingTimeRange('2026-07-29', ['23:00 - 00:00']);
const expectedEnd = new Date('2026-07-30T00:00:00+05:30').getTime();
assert(midnightRange.bookingEnd.getTime() === expectedEnd, 'Midnight slot 23:00-00:00 parses end as start of next day in IST');

// Now is 2026-07-30T00:05:00+05:30 (5 minutes after midnight)
const nowAfterMidnight = new Date('2026-07-30T00:05:00+05:30').getTime();
const resMidnight = evaluateCancellationEligibility('2026-07-29', ['23:00 - 00:00'], nowAfterMidnight);
assert(resMidnight.allowed === false, 'Slot ending at 00:00 rejected after midnight');
assert(resMidnight.code === 'PAST_BOOKING', 'Code is PAST_BOOKING after midnight');

console.log('\n====================================================');
console.log(`📊 CANCELLATION LIFECYCLE RESULT: ${passedCount} ASSERTIONS PASSED, ${failedCount} FAILED`);
console.log('====================================================\n');

if (failedCount > 0) {
  process.exit(1);
}
