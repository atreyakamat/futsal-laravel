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
export const DEFAULT_CANCEL_CUTOFF_HOURS = 3; // default fallback if setting not configured
export const DEFAULT_REFUND_TIMELINE = "Expected within 5–7 business days.";

export interface CancellationEligibility {
  allowed: boolean;
  code: 'ELIGIBLE' | 'PAST_BOOKING' | 'LATE_CANCELLATION' | 'ALREADY_REQUESTED' | 'NOT_CONFIRMED' | 'INVALID_TIME';
  message: string;
  bookingStart: Date;
  bookingEnd: Date;
  msUntilStart: number;
  msUntilEnd: number;
  cutoffHoursApplied: number;
}

export type RefundLifecycleStatus = 'PENDING_REVIEW' | 'APPROVED' | 'PROCESSING' | 'REFUNDED' | 'REJECTED';

export type RefundFeeMode = 'PERCENTAGE' | 'FIXED';

export interface RefundPolicyConfig {
  mode: RefundFeeMode;
  value: number; // percentage (e.g. 5) or fixed flat amount (e.g. 300)
}

export const DEFAULT_REFUND_POLICY_CONFIG: RefundPolicyConfig = {
  mode: 'PERCENTAGE',
  value: 5,
};

/**
 * Calculates the refundable amount after applying the configured fee policy
 * (FIXED per-slot fee or PERCENTAGE of gross). `slotCount` is the number of
 * booked slots in the group being refunded (defaults to 1 for callers that
 * only ever deal with a single slot) — in FIXED mode the fee is charged
 * per slot, e.g. 3 slots × ₹300 = ₹900, not a single flat ₹300 for the
 * whole booking. PERCENTAGE mode is unaffected by slot count since it
 * already scales with the gross amount.
 * Guarantees refund amount never drops below 0 (safely caps deduction to gross amount).
 */
export function calculateRefundAmount(
  grossAmount: number,
  config: Partial<RefundPolicyConfig> = DEFAULT_REFUND_POLICY_CONFIG,
  slotCount: number = 1
): {
  grossAmount: number;
  serviceFee: number;
  refundAmount: number;
  feeMode: RefundFeeMode;
  feeValue: number;
} {
  const mode: RefundFeeMode = config.mode === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED';
  const rawValue =
    typeof config.value === 'number' && !isNaN(config.value) && config.value >= 0
      ? config.value
      : (mode === 'PERCENTAGE' ? 5 : 300);
  const safeSlotCount = Number.isFinite(slotCount) && slotCount > 0 ? Math.floor(slotCount) : 1;

  let serviceFee: number;

  if (mode === 'PERCENTAGE') {
    serviceFee = parseFloat(((grossAmount * rawValue) / 100).toFixed(2));
  } else {
    // FIXED mode: flat monetary deduction PER SLOT (e.g. ₹300 × 3 slots = ₹900)
    // Capped at grossAmount to ensure refund is never negative
    serviceFee = parseFloat(Math.min(rawValue * safeSlotCount, grossAmount).toFixed(2));
  }

  const refundAmount = parseFloat(Math.max(0, grossAmount - serviceFee).toFixed(2));

  return {
    grossAmount: parseFloat(grossAmount.toFixed(2)),
    serviceFee,
    refundAmount,
    feeMode: mode,
    feeValue: rawValue,
  };
}

/**
 * Computes explicit Refund Lifecycle Status and exact customer messages for Customer Dashboard,
 * Arena Admin, and Super Admin portals.
 */
export function computeRefundLifecycleStatus(booking: {
  payment_status: string;
  cancellation_requested?: boolean;
  cancellation_reason?: string | null;
  refund_amount?: number | null;
  refund_status?: string | null;
  refund_reason?: string | null;
  refund_reviewed_at?: Date | string | null;
  refund_reviewed_by?: number | null;
  refund_processed_at?: Date | string | null;
}): {
  status: RefundLifecycleStatus;
  statusText: string;
  badgeClass: string;
  customerMessage: string;
  isRefunded: boolean;
  isRejected: boolean;
  isPending: boolean;
  isProcessing: boolean;
  isApproved: boolean;
  decisionText: string;
} {
  const explicitStatus = (booking.refund_status || '').toUpperCase();
  const reason = booking.refund_reason || booking.cancellation_reason || '';

  // 1. REFUNDED — Only explicit REFUNDED or payment_status === 'refunded'
  if (
    explicitStatus === 'REFUNDED' ||
    booking.payment_status === 'refunded'
  ) {
    return {
      status: 'REFUNDED',
      statusText: 'REFUNDED',
      badgeClass: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
      customerMessage: 'Your refund has been successfully processed.',
      isRefunded: true,
      isRejected: false,
      isPending: false,
      isProcessing: false,
      isApproved: true,
      decisionText: 'Accepted & Refunded',
    };
  }

  // 2. REJECTED
  if (explicitStatus === 'REJECTED' || reason.toUpperCase().startsWith('REJECTED:')) {
    return {
      status: 'REJECTED',
      statusText: 'REJECTED',
      badgeClass: 'border-red-500/30 text-red-400 bg-red-500/10',
      customerMessage: 'Your cancellation request has been rejected.',
      isRefunded: false,
      isRejected: true,
      isPending: false,
      isProcessing: false,
      isApproved: false,
      decisionText: 'Request Rejected',
    };
  }

  // 3. PROCESSING
  if (explicitStatus === 'PROCESSING' || explicitStatus === 'INITIATED') {
    return {
      status: 'PROCESSING',
      statusText: 'PROCESSING',
      badgeClass: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
      customerMessage: 'Your refund has been approved and is currently being processed.',
      isRefunded: false,
      isRejected: false,
      isPending: false,
      isProcessing: true,
      isApproved: true,
      decisionText: 'Approved (Processing Refund)',
    };
  }

  // 4. APPROVED
  if (explicitStatus === 'APPROVED' || reason.toUpperCase().includes('APPROVED')) {
    return {
      status: 'APPROVED',
      statusText: 'APPROVED',
      badgeClass: 'border-blue-500/30 text-blue-300 bg-blue-500/10',
      customerMessage: 'Your cancellation request has been approved.',
      isRefunded: false,
      isRejected: false,
      isPending: false,
      isProcessing: false,
      isApproved: true,
      decisionText: 'Request Approved',
    };
  }

  // 5. PENDING_REVIEW (Default for cancellation_requested = true)
  return {
    status: 'PENDING_REVIEW',
    statusText: 'PENDING REVIEW',
    badgeClass: 'border-amber-500/30 text-amber-300 bg-amber-500/10',
    customerMessage: 'Your cancellation request has been received and is awaiting review.',
    isRefunded: false,
    isRejected: false,
    isPending: true,
    isProcessing: false,
    isApproved: false,
    decisionText: 'Awaiting Admin Review',
  };
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
    const startDateObj = new Date(`${bookingDateStr}T00:00:00+05:30`);
    bookingEnd = new Date(startDateObj.getTime() + 24 * 60 * 60 * 1000);
  } else {
    bookingEnd = new Date(`${bookingDateStr}T${latestEndStr}:00+05:30`);
    if (bookingEnd.getTime() <= bookingStart.getTime()) {
      bookingEnd = new Date(bookingEnd.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  return { bookingStart, bookingEnd };
}

/**
 * Evaluates whether a customer self-cancellation is permitted according to time and lifecycle rules.
 */
export function evaluateCancellationEligibility(
  bookingDateStr: string,
  timeSlots: string[],
  now: number = Date.now(),
  cutoffHours: number = DEFAULT_CANCEL_CUTOFF_HOURS
): CancellationEligibility {
  const { bookingStart, bookingEnd } = getBookingTimeRange(bookingDateStr, timeSlots);

  const msUntilStart = bookingStart.getTime() - now;
  const msUntilEnd = bookingEnd.getTime() - now;
  const cutoffMs = cutoffHours * 60 * 60 * 1000;

  if (now >= bookingEnd.getTime()) {
    return {
      allowed: false,
      code: 'PAST_BOOKING',
      message: 'Cannot cancel a past or completed booking.',
      bookingStart,
      bookingEnd,
      msUntilStart,
      msUntilEnd,
      cutoffHoursApplied: cutoffHours,
    };
  }

  if (msUntilStart < cutoffMs) {
    return {
      allowed: false,
      code: 'LATE_CANCELLATION',
      message: `Cancellations are only allowed at least ${cutoffHours} hours before the game starts.`,
      bookingStart,
      bookingEnd,
      msUntilStart,
      msUntilEnd,
      cutoffHoursApplied: cutoffHours,
    };
  }

  return {
    allowed: true,
    code: 'ELIGIBLE',
    message: 'Cancellation is eligible.',
    bookingStart,
    bookingEnd,
    msUntilStart,
    msUntilEnd,
    cutoffHoursApplied: cutoffHours,
  };
}

export function isCancellationAllowed(bookingDateStr: string, slotStart: string, cutoffHours: number = DEFAULT_CANCEL_CUTOFF_HOURS): {
  allowed: boolean;
  msUntilBooking: number;
} {
  const evalResult = evaluateCancellationEligibility(bookingDateStr, [slotStart], Date.now(), cutoffHours);
  return {
    allowed: evalResult.allowed,
    msUntilBooking: evalResult.msUntilStart,
  };
}
