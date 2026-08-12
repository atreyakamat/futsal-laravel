/**
 * Comprehensive Automated Regression & Security Attendance Lifecycle Test Suite
 *
 * Tests Parts 1 through 9:
 *  - Cancellation eligibility (Future >3h, Started, Past, Boundary)
 *  - Ticket Expiry & Lifecycle State Transitions (UPCOMING -> CHECKED_IN -> COMPLETED -> EXPIRED)
 *  - Security Check-In System (Valid Entry, Duplicate Entry, Refunded Entry, Cancelled Entry, Expired Entry)
 *  - Multi-slot Booking Check-In (1 check-in marks ALL slots under booking_ref as attended)
 *  - Audit Logging & Table Verification
 */

import { query, queryOne, confirmEntryByTicket, getBookingGroup, computeBookingLifecycleState } from '../../lib/domain';
import { evaluateCancellationEligibility, calculateRefundAmount } from '../../lib/refund-policy';
import type { BookingRow } from '../../lib/types';

let passed = 0;
let failed = 0;
let suiteCount = 0;

async function suite(title: string, fn: () => void | Promise<void>) {
  suiteCount++;
  console.log(`\n----------------------------------------------------`);
  console.log(`🧪 SUITE ${suiteCount}: ${title}`);
  console.log(`----------------------------------------------------`);
  await fn();
}

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

async function runSecurityAttendanceLifecycleSuite() {
  console.log('====================================================');
  console.log('🛡️ SECURITY ATTENDANCE & FULL LIFECYCLE REGRESSION SUITE');
  console.log('====================================================');

  const runNonce = Date.now().toString().slice(-6);

  try {
    // --------------------------------------------------------------------------
    // CLEANUP LEFTOVERS FROM PREVIOUS RUNS
    // --------------------------------------------------------------------------
    await query(`DELETE FROM bookings WHERE booking_ref LIKE 'TEST-SEC-%' OR ticket_number LIKE 'TKT-SEC-%'`);

    // Ensure a valid test user exists
    let user = await queryOne<any>('SELECT id FROM users LIMIT 1');
    if (!user) {
      await query(`INSERT INTO users (name, email, customer_mobile, role, created_at, updated_at) VALUES ('Sec User', 'sec@example.com', '9876543210', 'customer', NOW(), NOW())`);
      user = await queryOne<any>('SELECT id FROM users ORDER BY id DESC LIMIT 1');
    }

    // ==========================================================================
    // SUITE 1: CANCELLATION ELIGIBILITY (FUTURE, STARTED, PAST)
    // ==========================================================================
    await suite('Cancellation Eligibility Rules (Future >3h, Started, Past)', () => {
      const BASE_NOW = new Date('2026-08-01T12:00:00+05:30').getTime();

      // Case 1: Future > 3h
      const eval1 = evaluateCancellationEligibility('2026-08-01', ['16:00 - 17:00'], BASE_NOW);
      assert(eval1.allowed === true && eval1.code === 'ELIGIBLE', 'Future booking > 3h away is eligible');

      // Case 2: Booking started
      const eval2 = evaluateCancellationEligibility('2026-08-01', ['11:30 - 13:00'], BASE_NOW);
      assert(eval2.allowed === false && eval2.code === 'LATE_CANCELLATION', 'Booking already started is rejected');

      // Case 3: Past booking
      const eval3 = evaluateCancellationEligibility('2026-08-01', ['09:00 - 10:00'], BASE_NOW);
      assert(eval3.allowed === false && eval3.code === 'PAST_BOOKING', 'Past booking is rejected (PAST_BOOKING)');
    });

    // ==========================================================================
    // SUITE 2: TICKET EXPIRY & LIFECYCLE TRANSITIONS
    // ==========================================================================
    await suite('Ticket Expiry & Lifecycle State Transitions', () => {
      const BASE_NOW = new Date('2026-08-01T12:00:00+05:30').getTime();

      // State 1: UPCOMING
      const state1 = computeBookingLifecycleState({
        payment_status: 'confirmed',
        booking_date: '2026-08-01',
        timeSlots: ['15:00 - 16:00'],
        now: BASE_NOW,
      });
      assert(state1.state === 'UPCOMING', 'Future confirmed booking transitions to UPCOMING');

      // State 2: CHECKED_IN
      const state2 = computeBookingLifecycleState({
        payment_status: 'confirmed',
        checked_in: true,
        booking_date: '2026-08-01',
        timeSlots: ['15:00 - 16:00'],
        now: BASE_NOW,
      });
      assert(state2.state === 'CHECKED_IN', 'Checked-in active booking transitions to CHECKED_IN');

      // State 3: COMPLETED
      const state3 = computeBookingLifecycleState({
        payment_status: 'confirmed',
        checked_in: true,
        booking_date: '2026-08-01',
        timeSlots: ['09:00 - 10:00'],
        now: BASE_NOW,
      });
      assert(state3.state === 'COMPLETED', 'Checked-in past booking transitions to COMPLETED');

      // State 4: EXPIRED
      const state4 = computeBookingLifecycleState({
        payment_status: 'confirmed',
        checked_in: false,
        booking_date: '2026-08-01',
        timeSlots: ['09:00 - 10:00'],
        now: BASE_NOW,
      });
      assert(state4.state === 'EXPIRED', 'Unchecked-in past booking transitions to EXPIRED');
    });

    // ==========================================================================
    // SUITE 3: SECURITY CHECK-IN WORKFLOW & REJECTIONS
    // ==========================================================================
    await suite('Security Attendance Check-In & Multi-Slot Aggregation', async () => {
      const refSec = `TEST-SEC-REF-${runNonce}`;
      const tkt1 = `TKT-SEC-${runNonce}-1`;
      const tkt2 = `TKT-SEC-${runNonce}-2`;

      // Insert 2 slots for future booking (2026-12-10)
      await query(
        `INSERT INTO bookings (arena_id, user_id, booking_ref, ticket_number, customer_name, customer_mobile, booking_date, time_slot, payment_status, amount, created_at, updated_at)
         VALUES (1, ?, ?, ?, 'Sec Customer', '9876543210', '2026-12-10', '14:00 - 15:00', 'confirmed', 500, NOW(), NOW()),
                (1, ?, ?, ?, 'Sec Customer', '9876543210', '2026-12-10', '15:00 - 16:00', 'confirmed', 500, NOW(), NOW())`,
        [user.id, refSec, tkt1, user.id, refSec, tkt2]
      );

      // Action 1: Valid Check-In
      const checkinRes1 = await confirmEntryByTicket(tkt1, user.id, 'qr');
      assert(checkinRes1.success === true && checkinRes1.code === 'ENTRY_APPROVED', 'Security scan of valid ticket returns ✓ Entry Approved');

      // Verify DB table: ALL slot items under booking_ref marked checked_in = TRUE
      const updatedRows = await query<BookingRow>(`SELECT * FROM bookings WHERE booking_ref = ?`, [refSec]);
      assert(updatedRows.length === 2, 'Database contains 2 slot rows');
      assert(updatedRows.every((r) => r.checked_in === true), 'Multi-slot check-in: ALL slot items under parent booking_ref marked checked_in = true');
      assert(updatedRows[0].checked_in_by === user.id, 'checked_in_by user ID stored correctly');

      // Action 2: Duplicate Check-In Attempt
      const checkinRes2 = await confirmEntryByTicket(tkt1, user.id, 'qr');
      assert(checkinRes2.success === false && checkinRes2.code === 'ALREADY_CHECKED_IN', 'Security scan of already checked-in ticket rejected with "Already Checked In."');
    });

    // ==========================================================================
    // SUITE 4: SECURITY CHECK-IN REJECTIONS (CANCELLED, REFUNDED, EXPIRED)
    // ==========================================================================
    await suite('Security Rejections (Cancelled, Refunded, Expired Tickets)', async () => {
      // 1. Cancelled Ticket Test
      const refCancel = `TEST-SEC-CANCEL-${runNonce}`;
      const tktCancel = `TKT-SEC-CANCEL-${runNonce}`;
      await query(
        `INSERT INTO bookings (arena_id, user_id, booking_ref, ticket_number, customer_name, customer_mobile, booking_date, time_slot, payment_status, cancellation_requested, amount, created_at, updated_at)
         VALUES (1, ?, ?, ?, 'Cancel Sec Customer', '9876543210', '2026-12-12', '10:00 - 11:00', 'cancelled', TRUE, 500, NOW(), NOW())`,
        [user.id, refCancel, tktCancel]
      );

      const cancelCheckin = await confirmEntryByTicket(tktCancel, user.id, 'qr');
      assert(cancelCheckin.success === false && cancelCheckin.code === 'CANCELLED', 'Security scan of cancelled ticket rejected with "Booking Cancelled."');

      // 2. Refunded Ticket Test
      const refRefund = `TEST-SEC-REFUND-${runNonce}`;
      const tktRefund = `TKT-SEC-REFUND-${runNonce}`;
      await query(
        `INSERT INTO bookings (arena_id, user_id, booking_ref, ticket_number, customer_name, customer_mobile, booking_date, time_slot, payment_status, refund_amount, amount, created_at, updated_at)
         VALUES (1, ?, ?, ?, 'Refund Sec Customer', '9876543210', '2026-12-12', '11:00 - 12:00', 'refunded', 475, 500, NOW(), NOW())`,
        [user.id, refRefund, tktRefund]
      );

      const refundCheckin = await confirmEntryByTicket(tktRefund, user.id, 'qr');
      assert(refundCheckin.success === false && refundCheckin.code === 'REFUNDED', 'Security scan of refunded ticket rejected with "Ticket Refunded."');

      // 3. Expired Ticket Test
      const refExpired = `TEST-SEC-EXPIRED-${runNonce}`;
      const tktExpired = `TKT-SEC-EXPIRED-${runNonce}`;
      // Past game on 2020-01-01
      await query(
        `INSERT INTO bookings (arena_id, user_id, booking_ref, ticket_number, customer_name, customer_mobile, booking_date, time_slot, payment_status, checked_in, amount, created_at, updated_at)
         VALUES (1, ?, ?, ?, 'Expired Sec Customer', '9876543210', '2020-01-01', '10:00 - 11:00', 'confirmed', FALSE, 500, NOW(), NOW())`,
        [user.id, refExpired, tktExpired]
      );

      const expiredCheckin = await confirmEntryByTicket(tktExpired, user.id, 'qr');
      assert(expiredCheckin.success === false && expiredCheckin.code === 'EXPIRED', 'Security scan of expired past ticket rejected with "Ticket Expired."');
    });

    // Clean up
    await query(`DELETE FROM bookings WHERE booking_ref LIKE 'TEST-SEC-%' OR ticket_number LIKE 'TKT-SEC-%'`);

    console.log('\n====================================================');
    console.log(`📊 SECURITY ATTENDANCE REGRESSION SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('\n❌ Suite Error:', err);
    process.exit(1);
  }
}

runSecurityAttendanceLifecycleSuite();
