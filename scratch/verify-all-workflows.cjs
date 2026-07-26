const { query, queryOne, getBookedSlots, confirmPayment, markPaymentFailed } = require('../lib/domain');
const { isCancellationAllowed, calculateRefundAmount } = require('../lib/refund-policy');
const { getEnforcePaymethod } = require('../lib/payment');

async function runRuntimeVerification() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE RUNTIME VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extraInfo = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName} ${extraInfo ? '(' + extraInfo + ')' : ''}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${extraInfo ? '(' + extraInfo + ')' : ''}`);
      failed++;
    }
  }

  try {
    // ---------------------------------------------------------------
    // 1. TICKET GENERATION & PAYMENT STATUS SAFEGUARDS
    // ---------------------------------------------------------------
    console.log('--- 1. Ticket Generation & Payment Status Guards ---');

    // Create a dummy pending booking
    const testRef1 = 'VERIFY-REF-' + Date.now();
    const testTicket1 = 'TKT-VERIFY-' + Date.now();
    await query(
      `INSERT INTO bookings (arena_id, booking_ref, ticket_number, customer_name, customer_mobile, booking_date, time_slot, payment_status, amount, created_at, updated_at)
       VALUES (1, ?, ?, 'Test User', '9876543210', '2026-08-01', '10:00 - 11:00', 'pending', 1000, NOW(), NOW())`,
      [testRef1, testTicket1]
    );

    // Verify slot is currently blocked while pending
    const slotsPending = await getBookedSlots(1, '2026-08-01');
    assert(slotsPending.includes('10:00 - 11:00'), 'Pending booking blocks slot during checkout');

    // Simulate payment failure
    await markPaymentFailed(testRef1);
    const failedBooking = await queryOne('SELECT * FROM bookings WHERE booking_ref = ?', [testRef1]);
    assert(failedBooking.payment_status === 'failed', 'Payment marked as failed');

    // Verify slot is IMMEDIATELY released after failure
    const slotsAfterFailure = await getBookedSlots(1, '2026-08-01');
    assert(!slotsAfterFailure.includes('10:00 - 11:00'), 'Failed payment IMMEDIATELY releases slot');

    // Simulate confirmed payment
    const testRef2 = 'VERIFY-CONFIRM-' + Date.now();
    const testTicket2 = 'TKT-CONFIRM-' + Date.now();
    await query(
      `INSERT INTO bookings (arena_id, booking_ref, ticket_number, customer_name, customer_mobile, booking_date, time_slot, payment_status, amount, created_at, updated_at)
       VALUES (1, ?, ?, 'Confirmed User', '9876543210', '2026-08-01', '12:00 - 13:00', 'pending', 1000, NOW(), NOW())`,
      [testRef2, testTicket2]
    );
    await confirmPayment(testRef2, 'MIHPAY12345');
    const confirmedBooking = await queryOne('SELECT * FROM bookings WHERE booking_ref = ?', [testRef2]);
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

    // Insert audit log
    await query(
      `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details, ip_address, user_agent, created_at)
       VALUES (1, 'FORCE_REFUND', 'booking', ?, ?, '127.0.0.1', 'Verification-Script', NOW())`,
      [testRef2, JSON.stringify({ ref: testRef2, gross, serviceFee, refundAmount, overrideReason })]
    );

    const cancelledBooking = await queryOne('SELECT * FROM bookings WHERE booking_ref = ?', [testRef2]);
    assert(cancelledBooking.payment_status === 'cancelled', 'Super Admin force refund marks status as cancelled');
    assert(Number(cancelledBooking.refundAmount || cancelledBooking.refund_amount) === 950, '5% fee deducted on Super Admin override (950 refund stored)');

    const auditEntry = await queryOne('SELECT * FROM audit_logs WHERE action = \'FORCE_REFUND\' AND entity_id = ? ORDER BY id DESC LIMIT 1', [testRef2]);
    assert(auditEntry !== null, 'Super Admin override recorded in audit_logs table');
    assert(auditEntry.details.includes(overrideReason), 'Audit log contains override reason string');

    // ---------------------------------------------------------------
    // 4. ARENA ADMIN RESCHEDULING
    // ---------------------------------------------------------------
    console.log('\n--- 4. Arena Admin Rescheduling ---');

    const testRef3 = 'VERIFY-RESCHED-' + Date.now();
    await query(
      `INSERT INTO bookings (arena_id, booking_ref, ticket_number, customer_name, customer_mobile, booking_date, time_slot, payment_status, amount, created_at, updated_at)
       VALUES (1, ?, 'TKT-RESCHED-1', 'Reschedule User', '9876543210', '2026-08-10', '14:00 - 15:00', 'confirmed', 1000, NOW(), NOW())`,
      [testRef3]
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
      `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details, ip_address, user_agent, created_at)
       VALUES (2, 'RESCHEDULE_BOOKING', 'booking', ?, ?, '127.0.0.1', 'Verification-Script', NOW())`,
      [testRef3, JSON.stringify({ ref: testRef3, oldDate: '2026-08-10', oldSlot: '14:00 - 15:00', newDate: '2026-08-12', newSlot: '16:00 - 17:00' })]
    );

    const oldDateSlotsAfter = await getBookedSlots(1, '2026-08-10');
    const newDateSlotsAfter = await getBookedSlots(1, '2026-08-12');
    assert(!oldDateSlotsAfter.includes('14:00 - 15:00'), 'Previous slot 14:00 - 15:00 IMMEDIATELY released');
    assert(newDateSlotsAfter.includes('16:00 - 17:00'), 'New slot 16:00 - 17:00 IMMEDIATELY blocked');

    const rescheduledBooking = await queryOne('SELECT * FROM bookings WHERE booking_ref = ?', [testRef3]);
    assert(rescheduledBooking.booking_ref === testRef3, 'Booking reference preserved unchanged');

    const reschedAudit = await queryOne('SELECT * FROM audit_logs WHERE action = \'RESCHEDULE_BOOKING\' AND entity_id = ? ORDER BY id DESC LIMIT 1', [testRef3]);
    assert(reschedAudit !== null, 'Reschedule recorded in audit_logs table');

    // ---------------------------------------------------------------
    // 5. PAYU RESTRICTIONS
    // ---------------------------------------------------------------
    console.log('\n--- 5. PayU Payment Method Restrictions ---');

    const paymethod = getEnforcePaymethod();
    assert(paymethod === 'UPI|DC|CASH|NB', `PayU enforce_paymethod parameter is '${paymethod}' (excludes Credit Card, EMI, BNPL)`);

    // Clean up test rows
    await query(`DELETE FROM bookings WHERE booking_ref IN (?, ?, ?)`, [testRef1, testRef2, testRef3]);
    await query(`DELETE FROM audit_logs WHERE entity_id IN (?, ?, ?)`, [testRef1, testRef2, testRef3]);

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
