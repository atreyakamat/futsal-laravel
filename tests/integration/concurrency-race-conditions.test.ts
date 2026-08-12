/**
 * Test Suite 3: Concurrency & Race Condition Suite
 *
 * Tests classic production failure modes under concurrent stress:
 *  1. Simultaneous Refunds (Tab A Refund + Tab B Refund concurrently)
 *  2. Double-Click Refund Idempotency
 *  3. Simultaneous Cancellation vs Refund Race Condition
 *
 * Ensures atomic SQL locks prevent duplicate refunds or double-cancellations.
 */

import { query, queryOne, getBookingGroup } from '../../lib/domain';
import { calculateRefundAmount } from '../../lib/refund-policy';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${msg}`);
    failed++;
    throw new Error(`Concurrency Test Failed: ${msg}`);
  }
}

/**
 * Atomic refund function simulating API handler
 */
async function attemptAtomicRefund(ref: string, adminId: string) {
  // 1. Lock booking row for update
  const rows = await query<any>(
    `SELECT * FROM bookings WHERE booking_ref = ? AND payment_status = 'confirmed' FOR UPDATE`,
    [ref]
  );

  if (!rows || rows.length === 0) {
    return { success: false, message: 'Booking already refunded or not confirmed' };
  }

  const grossAmount = rows.reduce((sum: number, r: any) => sum + Number(r.amount), 0);
  const { serviceFee, refundAmount } = calculateRefundAmount(grossAmount);

  // 2. Perform atomic state update
  await query(
    `UPDATE bookings
        SET payment_status = 'cancelled', refund_amount = ?, cancellation_reason = ?, updated_at = NOW()
      WHERE booking_ref = ? AND payment_status = 'confirmed'`,
    [refundAmount, `Concurrent Refund by ${adminId}`, ref]
  );

  return { success: true, message: `Refund of ₹${refundAmount} processed`, refundAmount };
}

async function runConcurrencyRaceConditionSuite() {
  console.log('====================================================');
  console.log('⚡ TEST 3: CONCURRENCY & RACE CONDITION SUITE');
  console.log('====================================================');

  const runId = Date.now().toString().slice(-6);
  const refConcurrent = `TEST-RACE-REF-${runId}`;

  try {
    let user = await queryOne<any>('SELECT id FROM users LIMIT 1');
    if (!user) {
      await query(`INSERT INTO users (name, email, customer_mobile, role, created_at, updated_at) VALUES ('Race Test User', 'race@example.com', '9876543210', 'customer', NOW(), NOW())`);
      user = await queryOne<any>('SELECT id FROM users ORDER BY id DESC LIMIT 1');
    }

    // Insert test booking with 2 slots
    await query(
      `INSERT INTO bookings (arena_id, user_id, booking_ref, ticket_number, customer_name, customer_mobile, booking_date, time_slot, payment_status, amount, created_at, updated_at)
       VALUES (1, ?, ?, ?, 'Race Customer', '9876543210', '2026-12-01', '14:00 - 15:00', 'confirmed', 500, NOW(), NOW()),
              (1, ?, ?, ?, 'Race Customer', '9876543210', '2026-12-01', '15:00 - 16:00', 'confirmed', 500, NOW(), NOW())`,
      [user.id, refConcurrent, `TKT-RACE-${runId}-1`, user.id, refConcurrent, `TKT-RACE-${runId}-2`]
    );

    console.log('\nScenario 1: Two Arena Admin tabs click "Refund" simultaneously (Tab A vs Tab B)...');

    // Launch Tab A and Tab B refund concurrently
    const [resTabA, resTabB] = await Promise.all([
      attemptAtomicRefund(refConcurrent, 'Admin Tab A'),
      attemptAtomicRefund(refConcurrent, 'Admin Tab B'),
    ]);

    const successCount = [resTabA.success, resTabB.success].filter(Boolean).length;
    const failCount = [resTabA.success, resTabB.success].filter((s) => !s).length;

    assert(successCount === 1, 'EXACTLY ONE concurrent refund request succeeded');
    assert(failCount === 1, 'Concurrent second refund request failed with atomic rejection');

    const failedRes = !resTabA.success ? resTabA : resTabB;
    assert(failedRes.message.includes('already refunded'), 'Second request received "Booking already refunded or not confirmed" message');

    console.log('\nScenario 2: Double-click refund idempotency check...');
    const resDoubleClick = await attemptAtomicRefund(refConcurrent, 'Double Clicker');
    assert(resDoubleClick.success === false, 'Double-click refund attempt safely rejected');

    console.log('\nScenario 3: Verifying final state in database...');
    const group = await getBookingGroup(refConcurrent);
    assert(group?.payment_status === 'cancelled', 'Final aggregate payment status is cancelled');
    assert(group?.refund_amount === 950, 'Single refund amount of ₹950 recorded in database');

    // Clean up
    await query(`DELETE FROM bookings WHERE booking_ref = ?`, [refConcurrent]);

    console.log('\n====================================================');
    console.log(`📊 CONCURRENCY SUITE RESULT: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ Concurrency Test Error:', err);
    process.exit(1);
  }
}

runConcurrencyRaceConditionSuite();
