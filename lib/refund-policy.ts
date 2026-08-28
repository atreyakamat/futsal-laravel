/**
 * lib/refund-policy.ts
 *
 * Centralised refund policy for Agnel Arena.
 *
 * Rules (as per Basil Sir & Booking Systems Engineering Specification, updated 2026-08-28):
 *  - Timezone: Asia/Kolkata (IST, UTC+5:30) as authoritative server clock.
 *  - Customer self-cancel: always allowed up until the game has ended (now < bookingEnd).
 *    There is no hard cutoff that blocks the cancellation action itself — only refund
 *    eligibility is time-boxed (see below). Once the game has ended, cancellation is
 *    rejected outright (PAST_BOOKING).
 *  - Refund eligibility: a cancellation is refund-eligible only when BOTH hold:
 *      (a) at least `cutoffHours` (default/floor 24h, admin-configurable 24–72h) before
 *          the booking's earliest slot start, AND
 *      (b) on or before the last day (23:59:59 IST) of the calendar month in which the
 *          booking was paid for — i.e. `bookings.created_at`'s IST month. Example: paid
 *          5 Sep → refund window closes end-of-day 30 Sep IST, regardless of how far out
 *          the booking date itself is.
 *    Failing either condition still lets the booking be cancelled — just with no refund
 *    (NO_REFUND_LATE if too close to play, NO_REFUND_MONTH_EXPIRED if past the invoice
 *    month's end).
 *  - Customer self-cancel: already requested or cancelled → rejected (ALREADY_REQUESTED).
 *  - Service Fee: 5% deducted from gross total amount on eligible refunds.
 *  - Super Admin: can bypass ALL time rules and force-refund at any point (always minus 5% fee).
 *  - Arena Admin: can reschedule any booking (via the separate admin reschedule tool)
 *    but CANNOT issue refunds.
 *  - Per-arena `customer_refund_enabled` setting: refunds are ON by default; an arena can
 *    set this to 'false' to opt OUT entirely (no refund ever for that arena).
 *  - Customer self-service rescheduling is currently disabled globally
 *    (RESCHEDULING_ENABLED = false) — cancellation is the only self-service
 *    remedy for now.
 */

export const REFUND_SERVICE_FEE_PCT = 5; // percentage deducted from eligible refunds
export const DEFAULT_CANCEL_CUTOFF_HOURS = 24; // default fallback if setting not configured
export const MIN_CANCEL_CUTOFF_HOURS = 24; // floor — refund eligibility requires at least this many hours before play
export const MAX_CANCEL_CUTOFF_HOURS = 72;
export const DEFAULT_REFUND_TIMELINE = "Expected within 5–7 business days.";

// Rescheduling replaces refunds as the default self-service remedy: a fixed
// 24h cutoff (not the admin-configurable cancellation cutoff — cancellation
// stays open closer to the slot, rescheduling does not), one use per
// booking, and the new date must land within 30 days of the original.
export const RESCHEDULE_CUTOFF_HOURS = 24;
export const RESCHEDULE_MAX_WINDOW_DAYS = 30;

export interface CancellationEligibility {
  /** Whether the cancellation action itself is permitted right now (false only once the game has ended). */
  allowed: boolean;
  /** Whether a refund should accompany this cancellation, independent of whether cancellation is allowed. */
  refundEligible: boolean;
  code: 'ELIGIBLE' | 'NO_REFUND_LATE' | 'NO_REFUND_MONTH_EXPIRED' | 'PAST_BOOKING' | 'ALREADY_REQUESTED' | 'NOT_CONFIRMED' | 'INVALID_TIME';
  message: string;
  bookingStart: Date;
  bookingEnd: Date;
  /** Last instant (23:59:59.999 IST, last day of the invoice month) a refund can still be claimed. */
  invoiceMonthEnd: Date;
  msUntilStart: number;
  msUntilEnd: number;
  cutoffHoursApplied: number;
}

export type RefundLifecycleStatus = 'PENDING_REVIEW' | 'APPROVED' | 'PROCESSING' | 'REFUNDED' | 'REJECTED' | 'NOT_APPLICABLE';

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
  isNotApplicable: boolean;
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
      isNotApplicable: false,
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
      isNotApplicable: false,
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
      isNotApplicable: false,
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
      isNotApplicable: false,
      decisionText: 'Request Approved',
    };
  }

  // 4b. NOT_APPLICABLE — pay-at-venue booking where nothing was ever collected,
  // so there is no refund to review or process.
  if (explicitStatus === 'NOT_APPLICABLE') {
    return {
      status: 'NOT_APPLICABLE',
      statusText: 'NO REFUND DUE',
      badgeClass: 'border-white/20 text-white/50 bg-white/5',
      customerMessage: 'This was a pay-at-venue booking with no payment collected, so no refund applies.',
      isRefunded: false,
      isRejected: false,
      isPending: false,
      isProcessing: false,
      isApproved: false,
      isNotApplicable: true,
      decisionText: 'No Refund Due',
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
    isNotApplicable: false,
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
 * Last instant a refund can still be claimed for a booking paid for on
 * `paymentDate`: 23:59:59.999 IST on the last calendar day of that payment's
 * IST month. Pure calendar-month arithmetic — the booking's own play date is
 * irrelevant here, only when it was *paid for* matters (e.g. paid 31 Aug for
 * a 1 Sep game still gets an August invoice month, ending 31 Aug 23:59:59 IST).
 */
export function getInvoiceMonthEnd(paymentDate: Date | string | number): Date {
  const d = typeof paymentDate === 'object' ? paymentDate : new Date(paymentDate);
  // Reinterpret in IST wall-clock terms (same trick as lib/gst-sequence.ts's
  // getFiscalYear) so the month boundary is correct regardless of server TZ.
  const istDate = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const year = istDate.getFullYear();
  const month = istDate.getMonth() + 1; // 1-12, IST calendar month of payment
  // Date.UTC(year, month, 0) — day 0 of the (0-indexed) `month`-th month is
  // the last day of the human-numbered `month`, e.g. month=9 (Sep) -> day 0
  // of JS month index 9 (October) = Sep 30.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, '0');
  const dd = String(lastDay).padStart(2, '0');
  return new Date(`${year}-${mm}-${dd}T23:59:59.999+05:30`);
}

/**
 * Evaluates whether a customer self-cancellation is permitted, and separately
 * whether it's refund-eligible, according to the rules documented at the top
 * of this file. `paymentDate` defaults to `now` so callers that don't care
 * about the invoice-month cap (e.g. tests exercising only the before-play
 * cutoff) get a trivially-satisfied month check.
 */
export function evaluateCancellationEligibility(
  bookingDateStr: string,
  timeSlots: string[],
  now: number = Date.now(),
  cutoffHours: number = DEFAULT_CANCEL_CUTOFF_HOURS,
  paymentDate: Date | string | number = now
): CancellationEligibility {
  const { bookingStart, bookingEnd } = getBookingTimeRange(bookingDateStr, timeSlots);
  const invoiceMonthEnd = getInvoiceMonthEnd(paymentDate);

  const msUntilStart = bookingStart.getTime() - now;
  const msUntilEnd = bookingEnd.getTime() - now;
  const cutoffMs = cutoffHours * 60 * 60 * 1000;

  const base = { bookingStart, bookingEnd, invoiceMonthEnd, msUntilStart, msUntilEnd, cutoffHoursApplied: cutoffHours };

  if (now >= bookingEnd.getTime()) {
    return {
      ...base,
      allowed: false,
      refundEligible: false,
      code: 'PAST_BOOKING',
      message: 'Cannot cancel a past or completed booking.',
    };
  }

  const withinPlayCutoff = msUntilStart >= cutoffMs;
  const withinInvoiceMonth = now <= invoiceMonthEnd.getTime();

  if (withinPlayCutoff && withinInvoiceMonth) {
    return {
      ...base,
      allowed: true,
      refundEligible: true,
      code: 'ELIGIBLE',
      message: 'Cancellation is eligible for a refund.',
    };
  }

  if (!withinInvoiceMonth) {
    return {
      ...base,
      allowed: true,
      refundEligible: false,
      code: 'NO_REFUND_MONTH_EXPIRED',
      message: 'The refund window for this booking (through the end of the month it was paid in) has closed. You can still cancel, but no refund will be issued.',
    };
  }

  return {
    ...base,
    allowed: true,
    refundEligible: false,
    code: 'NO_REFUND_LATE',
    message: `Cancellations within ${cutoffHours} hours of the game start are not eligible for a refund. You can still cancel, but no refund will be issued.`,
  };
}

/**
 * The latest instant a cancellation is still refund-eligible — the earlier
 * of "cutoffHours before bookingStart" and the invoice month's end. Lets UI
 * copy state a concrete deadline (e.g. "cancel before 4 Sep, 3:00 PM")
 * instead of relative phrasing.
 */
export function getRefundDeadline(bookingStart: Date, invoiceMonthEnd: Date, cutoffHours: number): Date {
  const playCutoff = new Date(bookingStart.getTime() - cutoffHours * 60 * 60 * 1000);
  return playCutoff.getTime() < invoiceMonthEnd.getTime() ? playCutoff : invoiceMonthEnd;
}

export function isCancellationAllowed(bookingDateStr: string, slotStart: string, cutoffHours: number = DEFAULT_CANCEL_CUTOFF_HOURS): {
  allowed: boolean;
  refundEligible: boolean;
  msUntilBooking: number;
} {
  const evalResult = evaluateCancellationEligibility(bookingDateStr, [slotStart], Date.now(), cutoffHours);
  return {
    allowed: evalResult.allowed,
    refundEligible: evalResult.refundEligible,
    msUntilBooking: evalResult.msUntilStart,
  };
}

// Global kill switch — self-service rescheduling by customers is currently
// disabled for all arenas (2026-08-28). This only gates the customer-facing
// flow (dashboard/reschedule, /api/bookings/reschedule); it does not affect
// the separate arena-admin reschedule tool used to manage bookings directly.
export const RESCHEDULING_ENABLED = false;

export interface RescheduleEligibility {
  allowed: boolean;
  code: 'ELIGIBLE' | 'PAST_BOOKING' | 'TOO_CLOSE_TO_START' | 'ALREADY_RESCHEDULED' | 'NOT_CONFIRMED' | 'DISABLED';
  message: string;
}

/**
 * Whether a confirmed booking can still be *rescheduled* (as opposed to
 * cancelled) — a fixed 24h cutoff, independent of the arena's configurable
 * cancellation cutoff, and blocked outright once already used once.
 */
export function evaluateRescheduleEligibility(
  bookingDateStr: string,
  timeSlots: string[],
  now: number = Date.now(),
  alreadyRescheduled: boolean = false,
  paymentStatus: string = 'confirmed'
): RescheduleEligibility {
  if (!RESCHEDULING_ENABLED) {
    return { allowed: false, code: 'DISABLED', message: 'Rescheduling is currently unavailable.' };
  }
  if (alreadyRescheduled) {
    return { allowed: false, code: 'ALREADY_RESCHEDULED', message: 'This booking has already been rescheduled once and cannot be rescheduled again.' };
  }
  if (paymentStatus !== 'confirmed') {
    return { allowed: false, code: 'NOT_CONFIRMED', message: 'Only confirmed bookings can be rescheduled.' };
  }

  const { bookingStart, bookingEnd } = getBookingTimeRange(bookingDateStr, timeSlots);
  const msUntilStart = bookingStart.getTime() - now;

  if (now >= bookingEnd.getTime()) {
    return { allowed: false, code: 'PAST_BOOKING', message: 'Cannot reschedule a past or completed booking.' };
  }

  if (msUntilStart < RESCHEDULE_CUTOFF_HOURS * 60 * 60 * 1000) {
    return {
      allowed: false,
      code: 'TOO_CLOSE_TO_START',
      message: `Rescheduling is only allowed at least ${RESCHEDULE_CUTOFF_HOURS} hours before the game starts. You can still cancel (no refund).`,
    };
  }

  return { allowed: true, code: 'ELIGIBLE', message: 'Rescheduling is eligible.' };
}

/**
 * Latest date (inclusive, "YYYY-MM-DD") a booking may be moved to — original
 * date + RESCHEDULE_MAX_WINDOW_DAYS. Pure UTC date-string arithmetic
 * (parses/formats as UTC) so it's never off by one for a caller in any
 * timezone, same reasoning as the client-side addDays in BookingSystem.tsx.
 */
export function getMaxRescheduleDate(bookingDateStr: string): string {
  const d = new Date(`${bookingDateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + RESCHEDULE_MAX_WINDOW_DAYS);
  return d.toISOString().slice(0, 10);
}
