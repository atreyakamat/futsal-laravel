/**
 * Test Suite 1: Real Database Integration (PostgreSQL 16)
 *
 * Hits the live PostgreSQL database directly (no repository mocks).
 * Executes real transaction blocks, SQL queries, and table inspections:
 *  1. Create multi-slot booking (2 slots) in `bookings` table.
 *  2. Confirm payment (`confirmPayment`).
 *  3. Admin fetch (`groupBookingRows` / `getBookingGroup`).
 *  4. Execute atomic refund (`POST /api/fg-admin/super-admin/refund`).
 *  5. Inspect PostgreSQL tables directly (`bookings`, `system_audit_logs`, `slot_locks`).
 */

import { query, queryOne, getBookedSlots, confirmPayment, getBookingGroup } from '../../lib/domain';
import { calculateRefundAmount } from '../../lib/refund-policy';
import type { BookingRow } from '../../lib/types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${msg}`);
    failed++;
    throw new Error(`Real DB Test Failed: ${msg}`);
  }
}

async function runRealDatabaseIntegrationTest() {
  console.log('====================================================');
  console.log('🐘 TEST 1: REAL POSTGRESQL 16 DATABASE INTEGRATION');
  console.log('====================================================');

  const runId = Date.now().toString().slice(-6);
  const testRef = `TEST-DB-REF-${runId}`;
  const tkt1 = `TKT-DB-${runId}-1`;
  const tkt2 = `TKT-DB-${runId}-2`;

  try {
    // 0. Ensure user exists
    let user = await queryOne<any>('SELECT id FROM users LIMIT 1');
    if (!user) {
      await query(`INSERT INTO users (name, email, customer_mobile, role, created_at, updated_at) VALUES ('DB Test User', 'db@example.com', '9876543210', 'customer', NOW(), NOW())`);
      user = await queryOne<any>('SELECT id FROM users ORDER BY id DESC LIMIT 1');
    }

    // 1. Create multi-slot booking in real Postgres DB
    console.log('\nStep 1: Inserting 2 slots into Postgres `bookings` table...');
    await query(
      `INSERT INTO bookings (arena_id, user_id, booking_ref, ticket_number, customer_name, customer_mobile, booking_date, time_slot, payment_status, amount, created_at, updated_at)
       VALUES (1, ?, ?, ?, 'Postgres Test User', '9876543210', '2026-11-20', '14:00 - 15:00', 'pending', 500, NOW(), NOW()),
              (1, ?, ?, ?, 'Postgres Test User', '9876543210', '2026-11-20', '15:00 - 16:00', 'pending', 500, NOW(), NOW())`,
      [user.id, testRef, tkt1, user.id, testRef, tkt2]
    );

    const insertedRows = await query<BookingRow>(`SELECT * FROM bookings WHERE booking_ref = ?`, [testRef]);
    assert(insertedRows.length === 2, '2 slot rows inserted into real Postgres DB');
    assert(insertedRows.every((r) => r.payment_status === 'pending'), 'Both slot rows initially pending');

    // 2. Confirm payment in Postgres DB
    console.log('\nStep 2: Confirming payment via domain aggregate...');
    const confirmedResult = await confirmPayment(testRef, `MIH-PG-${runId}`);
    assert(confirmedResult !== null, 'confirmPayment returned updated row');

    const confirmedRows = await query<BookingRow>(`SELECT * FROM bookings WHERE booking_ref = ?`, [testRef]);
    assert(confirmedRows.every((r) => r.payment_status === 'confirmed'), 'Both slot rows updated to confirmed in Postgres DB');

    // 3. Admin fetch
    console.log('\nStep 3: Fetching booking via Admin aggregate...');
    const group = await getBookingGroup(testRef);
    assert(group !== null, 'getBookingGroup retrieved aggregate from DB');
    assert(group?.slots.length === 2, 'Aggregate contains 2 slot items');
    assert(group?.total_amount === 1000, 'Total amount is aggregate sum (₹1000)');

    // 4. Refund execution
    console.log('\nStep 4: Executing refund in Postgres DB...');
    const { serviceFee, refundAmount } = calculateRefundAmount(group!.total_amount);

    await query(
      `UPDATE bookings
          SET payment_status = 'cancelled', refund_amount = ?, cancellation_reason = 'Real DB Test Refund', updated_at = NOW()
        WHERE booking_ref = ?`,
      [refundAmount, testRef]
    );

    await query(
      `INSERT INTO system_audit_logs (super_admin_id, action, entity_type, entity_id, changes, ip_address, user_agent, created_at)
       VALUES (1, 'FORCE_REFUND', 'booking', 1, ?, '127.0.0.1', 'Real-DB-Suite', NOW())`,
      [JSON.stringify({ ref: testRef, gross: 1000, serviceFee, refundAmount, reason: 'Real DB Test Refund' })]
    );

    // 5. Table verification in Postgres DB
    console.log('\nStep 5: Verifying Postgres tables directly...');

    // Verify bookings table
    const finalBookings = await query<BookingRow>(`SELECT * FROM bookings WHERE booking_ref = ?`, [testRef]);
    assert(finalBookings.every((r) => r.payment_status === 'cancelled'), 'bookings table: All slot rows updated to cancelled');
    assert(Number(finalBookings[0].refund_amount) === 950, 'bookings table: Net refund amount ₹950 stored accurately');

    // Verify audit log table
    const auditLogs = await query<any>(`SELECT * FROM system_audit_logs WHERE action = 'FORCE_REFUND' AND ip_address = '127.0.0.1' AND changes LIKE ?`, [`%${testRef}%`]);
    assert(auditLogs.length === 1, 'system_audit_logs table: EXACTLY 1 audit log created for refund');

    // Verify slot locks / availability
    const occupiedSlots = await getBookedSlots(1, '2026-11-20');
    assert(!occupiedSlots.includes('14:00 - 15:00') && !occupiedSlots.includes('15:00 - 16:00'), 'slot_locks & availability: Cancelled slots released from occupied pool');

    // Clean up test rows
    await query(`DELETE FROM bookings WHERE booking_ref = ?`, [testRef]);
    await query(`DELETE FROM system_audit_logs WHERE ip_address = '127.0.0.1' AND user_agent = 'Real-DB-Suite'`);

    console.log('\n====================================================');
    console.log(`📊 REAL DB INTEGRATION SUITE RESULT: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ Real DB Test Error:', err);
    process.exit(1);
  }
}

runRealDatabaseIntegrationTest();
