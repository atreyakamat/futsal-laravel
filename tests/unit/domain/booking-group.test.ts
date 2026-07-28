/**
 * Domain Unit Test Suite for BookingGroup Aggregate Root
 *
 * Validates domain model invariants, aggregate grouping, cancellation,
 * refund logic, edge cases, and regression safeguards for multi-slot bookings.
 */
import { groupBookingRows } from '../../../lib/domain';
import { calculateRefundAmount, isCancellationAllowed } from '../../../lib/refund-policy';
import type { BookingRow, BookingGroup } from '../../../lib/types';

// Simple assertion helper for deterministic tsx & vitest compatibility
function assert(condition: boolean, testName: string, detail: string = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName} ${detail ? '(' + detail + ')' : ''}`);
    totalPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${detail ? '(' + detail + ')' : ''}`);
    totalFailed++;
    throw new Error(`Test Failed: ${testName} — ${detail}`);
  }
}

let totalPassed = 0;
let totalFailed = 0;
let totalSuites = 0;

function suite(name: string, fn: () => void) {
  totalSuites++;
  console.log(`\n----------------------------------------------------`);
  console.log(`🧪 SUITE ${totalSuites}: ${name}`);
  console.log(`----------------------------------------------------`);
  fn();
}

console.log('====================================================');
console.log('📦 BOOKINGGROUP AGGREGATE DOMAIN UNIT TEST SUITE');
console.log('====================================================');

// Mock data generator helper
function createMockRow(overrides: Partial<BookingRow> = {}): BookingRow {
  return {
    id: overrides.id ?? 1,
    ticket_number: overrides.ticket_number ?? 'TKT-20260728-0001',
    booking_ref: overrides.booking_ref ?? 'REF-SINGLE-100',
    arena_id: overrides.arena_id ?? 1,
    user_id: overrides.user_id ?? 10,
    booking_date: overrides.booking_date ?? '2026-08-20',
    time_slot: overrides.time_slot ?? '14:00 - 15:00',
    customer_name: overrides.customer_name ?? 'Test Customer',
    customer_mobile: overrides.customer_mobile ?? '9876543210',
    customer_email: overrides.customer_email !== undefined ? overrides.customer_email : 'customer@example.com',
    amount: overrides.amount ?? 500,
    payment_status: overrides.payment_status ?? 'confirmed',
    payment_method: overrides.payment_method ?? 'online',
    checked_in: overrides.checked_in ?? false,
    is_free_booking: overrides.is_free_booking ?? false,
    payu_mihpayid: overrides.payu_mihpayid ?? 'MIH-10001',
    cancellation_requested: overrides.cancellation_requested ?? false,
    cancellation_reason: overrides.cancellation_reason ?? null,
    refund_amount: overrides.refund_amount ?? null,
    created_at: overrides.created_at ?? new Date('2026-07-28T10:00:00Z'),
    updated_at: overrides.updated_at ?? new Date('2026-07-28T10:00:00Z'),
  };
}

// ==============================================================================
// TEST SUITE 1: Single Slot Booking
// ==============================================================================
suite('Single Slot Booking Aggregate', () => {
  // Arrange
  const row = createMockRow({ booking_ref: 'REF-SINGLE-1', amount: 600, payment_status: 'confirmed' });

  // Act
  const groups = groupBookingRows([row]);

  // Assert
  assert(groups.length === 1, 'Returns exactly one BookingGroup');
  assert(groups[0].slots.length === 1, 'Contains exactly one slot item');
  assert(groups[0].total_amount === 600, 'Total amount equals slot amount (₹600)');
  assert(groups[0].booking_ref === 'REF-SINGLE-1', 'booking_ref is preserved');
  assert(groups[0].payment_status === 'confirmed', 'Payment status is preserved');
});

// ==============================================================================
// TEST SUITE 2: Two Slot Booking
// ==============================================================================
suite('Two Slot Booking Aggregate', () => {
  // Arrange
  const row1 = createMockRow({ id: 10, booking_ref: 'REF-PAIR-2', time_slot: '14:00 - 15:00', amount: 500 });
  const row2 = createMockRow({ id: 11, booking_ref: 'REF-PAIR-2', time_slot: '15:00 - 16:00', amount: 500 });

  // Act
  const groups = groupBookingRows([row1, row2]);

  // Assert
  assert(groups.length === 1, 'Returns exactly one BookingGroup for 2 rows sharing booking_ref');
  assert(groups[0].slots.length === 2, 'Slot count equals 2');
  assert(groups[0].total_amount === 1000, 'Total amount equals sum of slots (500 + 500 = 1000)');
  assert(groups[0].slots[0].time_slot === '14:00 - 15:00', 'Slot 1 ordering preserved');
  assert(groups[0].slots[1].time_slot === '15:00 - 16:00', 'Slot 2 ordering preserved');
  assert(groups[0].customer_mobile === '9876543210', 'Customer details identical across slots');
  assert(groups[0].payment_status === 'confirmed', 'Payment status inherited correctly');
});

// ==============================================================================
// TEST SUITE 3: Three Slot Booking
// ==============================================================================
suite('Three Slot Booking Aggregate', () => {
  // Arrange
  const rows = [
    createMockRow({ id: 21, booking_ref: 'REF-TRIO-3', time_slot: '10:00 - 11:00', amount: 400 }),
    createMockRow({ id: 22, booking_ref: 'REF-TRIO-3', time_slot: '11:00 - 12:00', amount: 400 }),
    createMockRow({ id: 23, booking_ref: 'REF-TRIO-3', time_slot: '12:00 - 13:00', amount: 400 }),
  ];

  // Act
  const groups = groupBookingRows(rows);

  // Assert
  assert(groups.length === 1, 'Returns exactly one BookingGroup for 3 consecutive slots');
  assert(groups[0].slots.length === 3, 'Slot count equals 3');
  assert(groups[0].total_amount === 1200, 'Total amount equals ₹1200 (400 * 3)');
  assert(groups[0].booking_ref === 'REF-TRIO-3', 'Booking reference remains unchanged');
});

// ==============================================================================
// TEST SUITE 4: Multiple Independent Bookings
// ==============================================================================
suite('Multiple Independent Bookings Isolation', () => {
  // Arrange
  const rows = [
    createMockRow({ id: 31, booking_ref: 'REF-BOOKING-A', customer_name: 'Alice', amount: 500 }),
    createMockRow({ id: 32, booking_ref: 'REF-BOOKING-B', customer_name: 'Bob', amount: 700 }),
    createMockRow({ id: 33, booking_ref: 'REF-BOOKING-C', customer_name: 'Charlie', amount: 800 }),
  ];

  // Act
  const groups = groupBookingRows(rows);

  // Assert
  assert(groups.length === 3, 'Returns exactly 3 distinct BookingGroups');
  assert(groups[0].booking_ref === 'REF-BOOKING-A' && groups[0].customer_name === 'Alice', 'Booking A isolated');
  assert(groups[1].booking_ref === 'REF-BOOKING-B' && groups[1].customer_name === 'Bob', 'Booking B isolated');
  assert(groups[2].booking_ref === 'REF-BOOKING-C' && groups[2].customer_name === 'Charlie', 'Booking C isolated');
});

// ==============================================================================
// TEST SUITE 5: Mixed Dataset Aggregation
// ==============================================================================
suite('Mixed Dataset Multi-Slot Aggregation', () => {
  // Arrange: Booking A (2 slots), Booking B (1 slot), Booking C (3 slots)
  const rows = [
    createMockRow({ id: 41, booking_ref: 'REF-MIX-A', time_slot: '14:00-15:00', amount: 500 }),
    createMockRow({ id: 42, booking_ref: 'REF-MIX-A', time_slot: '15:00-16:00', amount: 500 }),
    createMockRow({ id: 43, booking_ref: 'REF-MIX-B', time_slot: '18:00-19:00', amount: 600 }),
    createMockRow({ id: 44, booking_ref: 'REF-MIX-C', time_slot: '09:00-10:00', amount: 400 }),
    createMockRow({ id: 45, booking_ref: 'REF-MIX-C', time_slot: '10:00-11:00', amount: 400 }),
    createMockRow({ id: 46, booking_ref: 'REF-MIX-C', time_slot: '11:00-12:00', amount: 400 }),
  ];

  // Act
  const groups = groupBookingRows(rows);

  // Assert
  assert(groups.length === 3, 'Total BookingGroup count equals 3');
  assert(groups[0].slots.length === 2 && groups[0].total_amount === 1000, 'Booking A: 2 slots, ₹1000 total');
  assert(groups[1].slots.length === 1 && groups[1].total_amount === 600, 'Booking B: 1 slot, ₹600 total');
  assert(groups[2].slots.length === 3 && groups[2].total_amount === 1200, 'Booking C: 3 slots, ₹1200 total');
});

// ==============================================================================
// TEST SUITE 6: Refund Calculation & Rounding Rules
// ==============================================================================
suite('Refund Calculation & 5% Fee Deductions', () => {
  // Case 1: Gross ₹1000 -> 5% fee ₹50, Refund ₹950
  const calc1000 = calculateRefundAmount(1000);
  assert(calc1000.grossAmount === 1000, 'Case 1: Gross is ₹1000');
  assert(calc1000.serviceFee === 50, 'Case 1: Service fee is ₹50 (5%)');
  assert(calc1000.refundAmount === 950, 'Case 1: Refund amount is ₹950');

  // Case 2: Gross ₹500 -> 5% fee ₹25, Refund ₹475
  const calc500 = calculateRefundAmount(500);
  assert(calc500.serviceFee === 25 && calc500.refundAmount === 475, 'Case 2: Gross ₹500 -> ₹25 fee, ₹475 refund');

  // Case 3: Gross ₹2000 -> 5% fee ₹100, Refund ₹1900
  const calc2000 = calculateRefundAmount(2000);
  assert(calc2000.serviceFee === 100 && calc2000.refundAmount === 1900, 'Case 3: Gross ₹2000 -> ₹100 fee, ₹1900 refund');

  // Case 4: Decimal rounding (Gross ₹755.50 -> 5% fee ₹37.77, Refund ₹717.73)
  const calcDec = calculateRefundAmount(755.50);
  assert(calcDec.serviceFee === 37.77, 'Case 4: Decimal rounding service fee ₹37.77');
  assert(calcDec.refundAmount === 717.73, 'Case 4: Decimal rounding net refund ₹717.73');
});

// ==============================================================================
// TEST SUITE 7: Cancellation Domain Logic
// ==============================================================================
suite('Cancellation on BookingGroup Aggregate', () => {
  // Arrange: Parent booking with 2 slots
  const rows = [
    createMockRow({ id: 51, booking_ref: 'REF-CANCEL-1', amount: 500, payment_status: 'confirmed' }),
    createMockRow({ id: 52, booking_ref: 'REF-CANCEL-1', amount: 500, payment_status: 'confirmed' }),
  ];
  const group = groupBookingRows(rows)[0];

  // Act: Simulate cancellation mutation on group
  const refundInfo = calculateRefundAmount(group.total_amount);
  const updatedRows = rows.map((r) => ({
    ...r,
    payment_status: 'cancelled' as const,
    cancellation_requested: true,
    cancellation_reason: 'User Requested',
    refund_amount: refundInfo.refundAmount,
  }));
  const cancelledGroup = groupBookingRows(updatedRows)[0];

  // Assert
  assert(cancelledGroup.payment_status === 'cancelled', 'Parent BookingGroup status updated to cancelled');
  assert(cancelledGroup.slots.length === 2, 'All 2 slot items present under parent');
  assert(cancelledGroup.cancellation_requested === true, 'Cancellation requested flag set');
  assert(cancelledGroup.refund_amount === 950, 'Single net refund stored once for aggregate parent (₹950)');
  assert(cancelledGroup.booking_ref === 'REF-CANCEL-1', 'booking_ref remains unchanged after cancellation');
});

// ==============================================================================
// TEST SUITE 8: Payment State Consistency
// ==============================================================================
suite('Payment State Invariant Consistency', () => {
  // Arrange
  const rows = [
    createMockRow({ id: 61, booking_ref: 'REF-STATE-1', payment_status: 'confirmed' }),
    createMockRow({ id: 62, booking_ref: 'REF-STATE-1', payment_status: 'confirmed' }),
  ];

  // Act: Mutate all rows of parent to cancelled
  const cancelledRows = rows.map((r) => ({ ...r, payment_status: 'cancelled' as const }));
  const group = groupBookingRows(cancelledRows)[0];

  // Assert
  assert(group.payment_status === 'cancelled', 'Parent status is cancelled');
  const confirmedSlotsCount = group.slots.filter((s) => (s as any).payment_status === 'confirmed').length;
  assert(confirmedSlotsCount === 0, 'No slot item remains confirmed when parent is cancelled');
});

// ==============================================================================
// TEST SUITE 9: Booking Invariants Verification
// ==============================================================================
suite('Booking Invariants & Safety Rules', () => {
  // Invariant 1: Aggregate total MUST equal slot sum
  const rows1 = [
    createMockRow({ id: 71, booking_ref: 'REF-INV-1', amount: 450 }),
    createMockRow({ id: 72, booking_ref: 'REF-INV-1', amount: 550 }),
  ];
  const group1 = groupBookingRows(rows1)[0];
  const calculatedSum = group1.slots.reduce((s, item) => s + item.amount, 0);
  assert(group1.total_amount === calculatedSum, 'Invariant 1: Aggregate total equals exact slot sum (1000)');

  // Invariant 2: No duplicate booking_ref aggregates
  const groups2 = groupBookingRows(rows1);
  assert(groups2.length === 1, 'Invariant 2: No duplicate BookingGroup aggregates produced for same ref');

  // Invariant 3: Parent with zero slots is impossible when grouping valid rows
  assert(group1.slots.length > 0, 'Invariant 3: Parent BookingGroup cannot have zero slots');

  // Invariant 4: Non-negative refund amounts
  const refundCheck = calculateRefundAmount(0);
  assert(refundCheck.refundAmount >= 0, 'Invariant 4: Refund amount cannot be negative');
});

// ==============================================================================
// TEST SUITE 10: Edge Cases & Defensive Input Processing
// ==============================================================================
suite('Edge Cases & Defensive Input Processing', () => {
  // Case 1: Empty input array
  const emptyGroups = groupBookingRows([]);
  assert(emptyGroups.length === 0, 'Case 1: Empty input array returns empty BookingGroup array');

  // Case 2: Single booking with null email
  const nullEmailRow = createMockRow({ customer_email: null });
  const nullEmailGroup = groupBookingRows([nullEmailRow])[0];
  assert(nullEmailGroup.customer_email === null, 'Case 2: Null customer email handled safely');

  // Case 3: Free booking (amount 0)
  const freeRow = createMockRow({ amount: 0, is_free_booking: true });
  const freeGroup = groupBookingRows([freeRow])[0];
  assert(freeGroup.total_amount === 0 && freeGroup.is_free_booking === true, 'Case 3: Free booking (amount 0) processed cleanly');
});

// ==============================================================================
// TEST SUITE 11: Production Bug Regression Safeguard
// ==============================================================================
suite('Production Bug Regression Safeguard (Multi-Slot Grouping)', () => {
  /**
   * REPRODUCTION OF ORIGINAL BUG:
   * Customer booked 2:00 PM – 3:00 PM and 3:00 PM – 4:00 PM in 1 checkout.
   * Arena Admin previously saw 2 separate booking cards/rows for the same ref.
   *
   * REGRESSION GUARD:
   * Verify groupBookingRows MUST aggregate both slot rows into EXACTLY 1 BookingGroup.
   */

  // Arrange: Customer buys 2PM-3PM and 3PM-4PM under REF-PROD-BUG-FIX
  const slot2PM = createMockRow({
    id: 901,
    booking_ref: 'REF-PROD-BUG-FIX',
    ticket_number: 'TKT-PROD-901',
    time_slot: '14:00 - 15:00',
    amount: 500,
    payment_status: 'confirmed',
  });
  const slot3PM = createMockRow({
    id: 902,
    booking_ref: 'REF-PROD-BUG-FIX',
    ticket_number: 'TKT-PROD-902',
    time_slot: '15:00 - 16:00',
    amount: 500,
    payment_status: 'confirmed',
  });

  // Act
  const groups = groupBookingRows([slot2PM, slot3PM]);

  // Assert (Permanent Guard)
  assert(groups.length === 1, 'REGRESSION GUARD: Exactly ONE BookingGroup created for multi-slot checkout');
  assert(groups[0].booking_ref === 'REF-PROD-BUG-FIX', 'REGRESSION GUARD: booking_ref preserved');
  assert(groups[0].slots.length === 2, 'REGRESSION GUARD: Contains TWO slot items (2PM-3PM and 3PM-4PM)');
  assert(groups[0].total_amount === 1000, 'REGRESSION GUARD: Combined total amount is ₹1000');
});

// Summary Report
console.log('\n====================================================');
console.log(`📊 TOTAL RESULTS: ${totalSuites} SUITES, ${totalPassed} ASSERTIONS PASSED, ${totalFailed} FAILED`);
console.log('====================================================\n');

if (totalFailed > 0) {
  process.exit(1);
}
