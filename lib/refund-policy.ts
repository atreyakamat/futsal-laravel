/**
 * lib/refund-policy.ts
 *
 * Centralised refund policy for Agnel Arena.
 *
 * Rules (as per Basil Sir & Booking Systems Engineering Specification):
 *  - Timezone: Asia/Kolkata (IST, UTC+5:30) as authoritative server clock.
 *  - Customer self-cancel: allowed ≥ 3 hours before earliest slot start (bookingStart).
 *  - Customer self-cancel: < 3 hours before start OR game in progress → rejected (LATE_CANCELLATION).
 *  - Customer self-cancel: after game end (now >= bookingEnd) → rejected (PAST_BOOKING).
 *  - Customer self-cancel: already requested or cancelled → rejected (ALREADY_REQUESTED).
 *  - Service Fee: 5% deducted from gross total amount on eligible refunds.
 *  - Super Admin: can bypass ALL time rules and force-refund at any point (always minus 5% fee).
 *  - Arena Admin: can reschedule any booking but CANNOT issue refunds.
 */

export const REFUND_SERVICE_FEE_PCT = 5; // percentage deducted from eligible refunds
export const CANCEL_CUTOFF_HOURS = 3;    // hours before slot start required for customer cancellation

export interface CancellationEligibility {
  allowed: boolean;
  code: 'ELIGIBLE' | 'PAST_BOOKING' | 'LATE_CANCELLATION' | 'ALREADY_REQUESTED' | 'NOT_CONFIRMED' | 'INVALID_TIME';
  message: string;
  bookingStart: Date;
  bookingEnd: Date;
  msUntilStart: number;
  msUntilEnd: number;
}

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
 * Parses booking date and slot array into authoritative start and end Date objects in IST (+05:30).
 */
export function getBookingTimeRange(bookingDateStr: string, timeSlots: string[]): {
  bookingStart: Date;
  bookingEnd: Date;
} {
  if (!timeSlots || timeSlots.length === 0) {
    const defaultStart = new Date(`${bookingDateStr}T00:00:00+05:30`);
    return { bookingStart: defaultStart, bookingEnd: defaultStart };
  }

  // Parse all start and end times
  const starts: string[] = [];
  const ends: string[] = [];

  for (const slot of timeSlots) {
    if (slot.includes('-')) {
      const parts = slot.split('-').map((s) => s.trim());
      starts.push(parts[0]);
      ends.push(parts[1]);
    } else {
      starts.push(slot.trim());
      ends.push(slot.trim());
    }
  }

  starts.sort();
  ends.sort();

  const earliestStartStr = starts[0].padStart(5, '0');
  const latestEndStr = ends[ends.length - 1].padStart(5, '0');

  const bookingStart = new Date(`${bookingDateStr}T${earliestStartStr}:00+05:30`);

  let bookingEnd: Date;
  if (latestEndStr === '00:00' || latestEndStr === '24:00') {
    // End time is midnight at the start of next day
    const startDateObj = new Date(`${bookingDateStr}T00:00:00+05:30`);
    bookingEnd = new Date(startDateObj.getTime() + 24 * 60 * 60 * 1000);
  } else {
    bookingEnd = new Date(`${bookingDateStr}T${latestEndStr}:00+05:30`);
    // If end time is earlier or equal to start time (spans midnight), roll to next day
    if (bookingEnd.getTime() <= bookingStart.getTime()) {
      bookingEnd = new Date(bookingEnd.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  return { bookingStart, bookingEnd };
}

/**
 * Evaluates whether a customer self-cancellation is permitted according to time and lifecycle rules.
 *
 * @param bookingDateStr YYYY-MM-DD
 * @param timeSlots Array of time_slot strings (e.g. ["14:00 - 15:00", "15:00 - 16:00"])
 * @param now Optional override date for testing (defaults to server Date.now())
 */
export function evaluateCancellationEligibility(
  bookingDateStr: string,
  timeSlots: string[],
  now: number = Date.now()
): CancellationEligibility {
  const { bookingStart, bookingEnd } = getBookingTimeRange(bookingDateStr, timeSlots);

  const msUntilStart = bookingStart.getTime() - now;
  const msUntilEnd = bookingEnd.getTime() - now;
  const cutoffMs = CANCEL_CUTOFF_HOURS * 60 * 60 * 1000;

  // Rule 1: Past / Completed Booking (now >= bookingEnd)
  if (now >= bookingEnd.getTime()) {
    return {
      allowed: false,
      code: 'PAST_BOOKING',
      message: 'Cannot cancel a past or completed booking.',
      bookingStart,
      bookingEnd,
      msUntilStart,
      msUntilEnd,
    };
  }

  // Rule 2: Active or Late Cancellation (< 3h before bookingStart)
  if (msUntilStart < cutoffMs) {
    return {
      allowed: false,
      code: 'LATE_CANCELLATION',
      message: 'Cancellations are only allowed at least 3 hours before the game starts.',
      bookingStart,
      bookingEnd,
      msUntilStart,
      msUntilEnd,
    };
  }

  // Rule 3: Eligible Future Booking (now <= bookingStart - 3h)
  return {
    allowed: true,
    code: 'ELIGIBLE',
    message: 'Cancellation is eligible.',
    bookingStart,
    bookingEnd,
    msUntilStart,
    msUntilEnd,
  };
}

/**
 * Backwards-compatible wrapper for single slot cancellation check.
 */
export function isCancellationAllowed(bookingDateStr: string, slotStart: string): {
  allowed: boolean;
  msUntilBooking: number;
} {
  const evalResult = evaluateCancellationEligibility(bookingDateStr, [slotStart]);
  return {
    allowed: evalResult.allowed,
    msUntilBooking: evalResult.msUntilStart,
  };
}
