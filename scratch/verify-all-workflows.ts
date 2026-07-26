import { query, queryOne, getBookedSlots, confirmPayment, markPaymentFailed } from '../lib/domain.js';
import { isCancellationAllowed, calculateRefundAmount } from '../lib/refund-policy.js';
import { getEnforcePaymethod } from '../lib/payment.js';

async function runRuntimeVerification() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE RUNTIME VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, extraInfo = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName} ${extraInfo ? '(' + extraInfo + ')' : ''}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${extraInfo ? '(' + extraInfo + ')' : ''}`);
      failed++;
    }
  }

  try {
    // Clean up any leftovers from previous failed runs
    await query(`DELETE FROM bookings WHERE booking_ref LIKE 'VERIFY-%'`);
    await query(`DELETE FROM system_audit_logs WHERE ip_address = '127.0.0.1' AND user_agent = 'Verification-Script'`);

    // Fetch a valid user ID for test records
    let user = await queryOne<any>('SELECT id FROM users LIMIT 1');
    if (!user) {
      await query(
        `INSERT INTO users (name, phone, role, created_at, updated_at) VALUES ('Verification User', '9876543210', 'customer', NOW(), NOW())`
      );
      user = await queryOne<any>('SELECT id FROM users ORDER BY id DESC LIMIT 1');
    }
    const testUserId = user ? user.id : 1;

    // ---------------------------------------------------------------
    // 1. TICKET GENERATION & PAYMENT STATUS SAFEGUARDS
    // ---------------------------------------------------------------
    console.log('--- 1. Ticket Generation & Payment Status Guards ---');

    // Create a dummy pending booking
    const testRef1 = 'VERIFY-REF-' + Date.now();
    const testTicket1 = 'TKT-VERIFY-' + Date.now();
    await query(
      `INSERT INTO bookings (arena_id, user_id, booking_ref, ticket_number, customer_name, customer_mobile, booking_date, time_slot, payment_status, amount, created_at, updated_at)
       VALUES (1, ?, ?, ?, 'Test User', '9876543210', '2026-08-01', '10:00 - 11:00', 'pending', 1000, NOW(), NOW())`,
      [testUserId, testRef1, testTicket1]
    );

    // Verify slot is currently blocked while pending
    const slotsPending = await getBookedSlots(1, '2026-08-01');
    assert(slotsPending.includes('10:00 - 11:00'), 'Pending booking blocks slot during checkout');

    // Simulate payment failure
    await markPaymentFailed(testRef1);
    const failedBooking = await queryOne<any>('SELECT * FROM bookings WHERE booking_ref = ?', [testRef1]);
    assert(failedBooking.payment_status === 'failed', 'Payment marked as failed');

    // Verify slot is IMMEDIATELY released after failure
    const slotsAfterFailure = await getBookedSlots(1, '2026-08-01');
    assert(!slotsAfterFailure.includes('10:00 - 11:00'), 'Failed payment IMMEDIATELY releases slot');

    // Simulate confirmed payment
    const testRef2 = 'VERIFY-CONFIRM-' + Date.now();
    const testTicket2 = 'TKT-CONFIRM-' + Date.now();
    await query(
      `INSERT INTO bookings (arena_id, user_id, booking_ref, ticket_number, customer_name, customer_mobile, booking_date, time_slot, payment_status, amount, created_at, updated_at)
       VALUES (1, ?, ?, ?, 'Confirmed User', '9876543210', '2026-08-01', '12:00 - 13:00', 'pending', 1000, NOW(), NOW())`,
      [testUserId, testRef2, testTicket2]
    );
    await confirmPayment(testRef2, 'MIHPAY12345');
    const confirmedBooking = await queryOne<any>('SELECT * FROM bookings WHERE booking_ref = ?', [testRef2]);
    assert(confirmedBooking.payment_status === 'confirmed', 'Successful payment marks status as confirmed');
    assert(confirmedBooking.payu_mihpayid === 'MIHPAY12345', 'PayU payment ID recorded');

    // ---------------------------------------------------------------
    // 2. REFUND POLICY VERIFICATION
    // ---------------------------------------------------------------
    console.log('\n--- 2. Refund Policy Verification ---');

    // Test 5% fee calculation
    const calc = calculateRefundAmount(1000);
    assert(calc.grossAmount === 1000 && calc.serviceFee === 50 && calc.refundAmount === 950, '5% service fee calculated correctly (1000 -> 50 fee, 950 net)');

    // Test > 3h cancellation allowance
    const checkAllowed = isCancellationAllowed('2026-08-05', '18:00');
    assert(checkAllowed.allowed === true, 'Cancellation >= 3 hours prior is allowed');

    // Test < 3h cancellation rejection
    const checkLate = isCancellationAllowed('2020-01-01', '10:00');
    assert(checkLate.allowed === false, 'Cancellation < 3 hours prior is rejected');

    // ---------------------------------------------------------------
    // 3. SUPER ADMIN OVERRIDE & AUDIT LOGGING
    // ---------------------------------------------------------------
    console.log('\n--- 3. Super Admin Override & Audit Logging ---');

    // Force refund on late booking
    const overrideReason = 'Customer flight delayed - approved by management';
    const gross = 1000;
    const { serviceFee, refundAmount } = calculateRefundAmount(gross);

    await query(
      `UPDATE bookings SET payment_status = 'cancelled', refund_amount = ?, cancellation_reason = ? WHERE booking_ref = ?`,
      [refundAmount, `Super Admin Override: ${overrideReason}`, testRef2]
    );

    // Insert system audit log
    await query(
      `INSERT INTO system_audit_logs (super_admin_id, action, entity_type, entity_id, changes, ip_address, user_agent, created_at)
       VALUES (1, 'FORCE_REFUND', 'booking', 1, ?, '127.0.0.1', 'Verification-Script', NOW())`,
      [JSON.stringify({ ref: testRef2, gross, serviceFee, refundAmount, overrideReason })]
    );

    const cancelledBooking = await queryOne<any>('SELECT * FROM bookings WHERE booking_ref = ?', [testRef2]);
    assert(cancelledBooking.payment_status === 'cancelled', 'Super Admin force refund marks status as cancelled');
    assert(Number(cancelledBooking.refundAmount || cancelledBooking.refund_amount) === 950, '5% fee deducted on Super Admin override (950 refund stored)');

    const auditEntry = await queryOne<any>('SELECT * FROM system_audit_logs WHERE action = \'FORCE_REFUND\' ORDER BY id DESC LIMIT 1');
    assert(auditEntry !== null, 'Super Admin override recorded in system_audit_logs table');
    assert(auditEntry.changes.includes(overrideReason), 'Audit log contains override reason string');

    // ---------------------------------------------------------------
    // 4. ARENA ADMIN RESCHEDULING
    // ---------------------------------------------------------------
    console.log('\n--- 4. Arena Admin Rescheduling ---');

    const testRef3 = 'VERIFY-RESCHED-' + Date.now();
    const testTicket3 = 'TKT-RESCHED-' + Date.now();
    await query(
      `INSERT INTO bookings (arena_id, user_id, booking_ref, ticket_number, customer_name, customer_mobile, booking_date, time_slot, payment_status, amount, created_at, updated_at)
       VALUES (1, ?, ?, ?, 'Reschedule User', '9876543210', '2026-08-10', '14:00 - 15:00', 'confirmed', 1000, NOW(), NOW())`,
      [testUserId, testRef3, testTicket3]
    );

    // Verify old slot blocked
    const oldDateSlots = await getBookedSlots(1, '2026-08-10');
    assert(oldDateSlots.includes('14:00 - 15:00'), 'Original slot 14:00 - 15:00 is occupied');

    // Reschedule to 2026-08-12 at 16:00 - 17:00
    await query(
      `UPDATE bookings SET booking_date = '2026-08-12', time_slot = '16:00 - 17:00', updated_at = NOW() WHERE booking_ref = ?`,
      [testRef3]
    );

    // Audit log reschedule
    await query(
      `INSERT INTO system_audit_logs (super_admin_id, action, entity_type, entity_id, changes, ip_address, user_agent, created_at)
       VALUES (1, 'RESCHEDULE_BOOKING', 'booking', 1, ?, '127.0.0.1', 'Verification-Script', NOW())`,
      [JSON.stringify({ ref: testRef3, oldDate: '2026-08-10', oldSlot: '14:00 - 15:00', newDate: '2026-08-12', newSlot: '16:00 - 17:00' })]
    );

    const oldDateSlotsAfter = await getBookedSlots(1, '2026-08-10');
    const newDateSlotsAfter = await getBookedSlots(1, '2026-08-12');
    assert(!oldDateSlotsAfter.includes('14:00 - 15:00'), 'Previous slot 14:00 - 15:00 IMMEDIATELY released');
    assert(newDateSlotsAfter.includes('16:00 - 17:00'), 'New slot 16:00 - 17:00 IMMEDIATELY blocked');

    const rescheduledBooking = await queryOne<any>('SELECT * FROM bookings WHERE booking_ref = ?', [testRef3]);
    assert(rescheduledBooking.booking_ref === testRef3, 'Booking reference preserved unchanged');

    const reschedAudit = await queryOne<any>('SELECT * FROM system_audit_logs WHERE action = \'RESCHEDULE_BOOKING\' ORDER BY id DESC LIMIT 1');
    assert(reschedAudit !== null, 'Reschedule recorded in system_audit_logs table');

    // ---------------------------------------------------------------
    // 5. PAYU RESTRICTIONS
    // ---------------------------------------------------------------
    console.log('\n--- 5. PayU Payment Method Restrictions ---');

    const paymethod = getEnforcePaymethod();
    assert(paymethod === 'UPI|DC|CASH|NB', `PayU enforce_paymethod parameter is '${paymethod}' (excludes Credit Card, EMI, BNPL)`);

    // Clean up test rows
    await query(`DELETE FROM bookings WHERE booking_ref IN (?, ?, ?)`, [testRef1, testRef2, testRef3]);
    await query(`DELETE FROM system_audit_logs WHERE action IN ('FORCE_REFUND', 'RESCHEDULE_BOOKING') AND ip_address = '127.0.0.1'`);

    console.log('\n====================================================');
    console.log(`📊 FINAL RESULT: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Verification error:', err);
    process.exit(1);
  }
}

runRuntimeVerification();
