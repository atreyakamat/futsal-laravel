/**
 * Regression guard for computeRefundLifecycleStatus()'s NOT_APPLICABLE
 * branch in lib/refund-policy.ts — previously every refund_status =
 * 'NOT_APPLICABLE' booking showed the same hardcoded "this was a
 * pay-at-venue booking" message, even when the real reason was a late
 * cancellation, an arena opting out of refunds, or an expired invoice
 * month. app/api/bookings/cancel/route.ts now persists which one it was
 * as a 'NO_REFUND: <CODE>' cancellation_reason prefix; this asserts each
 * code maps to its own accurate customer-facing message, and that an old
 * booking with no recognizable code still falls back to the original
 * pay-at-venue wording rather than breaking. See openspec change
 * fix-past-slot-booking-and-cancellation-display.
 */
import { describe, it, expect } from 'vitest';
import { computeRefundLifecycleStatus } from '@/lib/refund-policy';

function cancelledBooking(cancellation_reason: string | null) {
  return {
    payment_status: 'cancelled',
    cancellation_requested: true,
    cancellation_reason,
    refund_amount: 0,
    refund_status: 'NOT_APPLICABLE',
  };
}

describe('computeRefundLifecycleStatus — NOT_APPLICABLE reason accuracy', () => {
  it('LATE_CUTOFF shows a late-cancellation message, not the pay-at-venue one', () => {
    const result = computeRefundLifecycleStatus(cancelledBooking('NO_REFUND: LATE_CUTOFF'));
    expect(result.isNotApplicable).toBe(true);
    expect(result.customerMessage).toMatch(/too close to its start time/i);
    expect(result.customerMessage).not.toMatch(/pay-at-venue/i);
  });

  it('MONTH_EXPIRED shows an invoice-month message, not the pay-at-venue one', () => {
    const result = computeRefundLifecycleStatus(cancelledBooking('NO_REFUND: MONTH_EXPIRED'));
    expect(result.customerMessage).toMatch(/refund window/i);
    expect(result.customerMessage).not.toMatch(/pay-at-venue/i);
  });

  it('ARENA_OPT_OUT shows an arena-policy message, not the pay-at-venue one', () => {
    const result = computeRefundLifecycleStatus(cancelledBooking('NO_REFUND: ARENA_OPT_OUT'));
    expect(result.customerMessage).toMatch(/no refund is issued for cancellations at this arena/i);
    expect(result.customerMessage).not.toMatch(/pay-at-venue/i);
  });

  it('OFFLINE_UNCOLLECTED shows the pay-at-venue message', () => {
    const result = computeRefundLifecycleStatus(cancelledBooking('NO_REFUND: OFFLINE_UNCOLLECTED'));
    expect(result.customerMessage).toMatch(/pay-at-venue/i);
  });

  it('falls back to the pay-at-venue message for a pre-existing booking with no reason code', () => {
    const result = computeRefundLifecycleStatus(cancelledBooking('User Requested'));
    expect(result.customerMessage).toMatch(/pay-at-venue/i);
  });

  it('falls back to the pay-at-venue message when cancellation_reason is null', () => {
    const result = computeRefundLifecycleStatus(cancelledBooking(null));
    expect(result.customerMessage).toMatch(/pay-at-venue/i);
  });
});
