/**
 * lib/refund-policy.ts
 *
 * Centralised refund policy for Agnel Arena.
 *
 * Rules (as per Basil Sir, 23-Jul-2026):
 *  - Customer self-cancel: allowed ≥ 3 hours before slot start → refund minus 5% service fee.
 *  - Customer self-cancel: < 3 hours before slot start → no refund.
 *  - Super Admin: can bypass ALL time rules and force-refund at any point, always minus 5% handling fee.
 *  - Arena Admin: can reschedule any booking but CANNOT issue refunds.
 */

export const REFUND_SERVICE_FEE_PCT = 5; // percentage deducted from eligible refunds
export const CANCEL_CUTOFF_HOURS = 3;    // hours before slot start required for customer cancellation

/**
 * Calculates the refundable amount after the 5% service fee deduction.
 */
export function calculateRefundAmount(grossAmount: number): {
  grossAmount: number;
  serviceFee: number;
  refundAmount: number;
} {
  const serviceFee = parseFloat(((grossAmount * REFUND_SERVICE_FEE_PCT) / 100).toFixed(2));
  const refundAmount = parseFloat((grossAmount - serviceFee).toFixed(2));
  return { grossAmount, serviceFee, refundAmount };
}

/**
 * Checks whether a customer self-cancellation is within the allowed time window.
 *
 * @param bookingDateStr  YYYY-MM-DD  (IST date of the game)
 * @param slotStart       "HH:MM"     (start time from time_slot field, e.g. "06:00")
 * @returns { allowed, msUntilBooking }
 */
export function isCancellationAllowed(bookingDateStr: string, slotStart: string): {
  allowed: boolean;
  msUntilBooking: number;
} {
  const bookingDateTime = new Date(`${bookingDateStr}T${slotStart}:00+05:30`);
  const msUntilBooking = bookingDateTime.getTime() - Date.now();
  const cutoffMs = CANCEL_CUTOFF_HOURS * 60 * 60 * 1000;
  return { allowed: msUntilBooking >= cutoffMs, msUntilBooking };
}
