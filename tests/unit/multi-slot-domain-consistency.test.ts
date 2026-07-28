import { groupBookingRows } from '../../lib/domain';
import { calculateRefundAmount } from '../../lib/refund-policy';
import type { BookingRow } from '../../lib/types';

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`✅ [PASS] ${description}`);
  } else {
    console.error(`❌ [FAIL] ${description}`);
    process.exit(1);
  }
}

console.log('====================================================');
console.log('🧪 RUNNING MULTI-SLOT DOMAIN MODEL CONSISTENCY SUITE');
console.log('====================================================\n');

// 1. Multi-slot grouping domain model test
const rawRows: BookingRow[] = [
  {
    id: 101,
    ticket_number: 'TKT-20260728-AAAA',
    booking_ref: 'REF-MULTISLOT-123',
    arena_id: 1,
    user_id: 5,
    booking_date: '2026-08-15',
    time_slot: '14:00 - 15:00',
    customer_name: 'John Doe',
    customer_mobile: '9876543210',
    customer_email: 'john@example.com',
    amount: 500,
    payment_status: 'confirmed',
    payment_method: 'online',
    checked_in: false,
    is_free_booking: false,
    payu_mihpayid: 'MIH99999',
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 102,
    ticket_number: 'TKT-20260728-BBBB',
    booking_ref: 'REF-MULTISLOT-123',
    arena_id: 1,
    user_id: 5,
    booking_date: '2026-08-15',
    time_slot: '15:00 - 16:00',
    customer_name: 'John Doe',
    customer_mobile: '9876543210',
    customer_email: 'john@example.com',
    amount: 500,
    payment_status: 'confirmed',
    payment_method: 'online',
    checked_in: false,
    is_free_booking: false,
    payu_mihpayid: 'MIH99999',
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const grouped = groupBookingRows(rawRows);
assert(grouped.length === 1, '2 slot rows sharing booking_ref produce EXACTLY 1 Parent Booking Entity');

const parent = grouped[0];
assert(parent.booking_ref === 'REF-MULTISLOT-123', 'Parent entity preserves booking_ref');
assert(parent.total_amount === 1000, 'Total amount is calculated as aggregate sum of slot amounts (1000)');
assert(parent.slots.length === 2, 'Parent entity contains array of 2 booking slot items');

// 2. Refund calculation on aggregate amount
const calc = calculateRefundAmount(parent.total_amount);
assert(calc.grossAmount === 1000 && calc.serviceFee === 50 && calc.refundAmount === 950, 'Refund calculated on parent aggregate (₹1000 gross -> ₹50 5% fee -> ₹950 refund)');

console.log('\n====================================================');
console.log('📊 DOMAIN CONSISTENCY RESULT: ALL ASSERTIONS PASSED');
console.log('====================================================');
