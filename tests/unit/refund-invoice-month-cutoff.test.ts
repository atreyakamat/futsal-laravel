/**
 * Edge-case suite for the month-end + before-play refund cutoff policy
 * introduced 2026-08-28 (see lib/refund-policy.ts header comment).
 *
 * Refund eligibility requires BOTH:
 *   (a) >= cutoffHours (default/floor 24h) before the booking's earliest slot start, AND
 *   (b) on or before 23:59:59.999 IST of the last day of the IST calendar month
 *       the booking was *paid for* (bookings.created_at), regardless of how
 *       far out the play date itself is.
 * Cancellation itself is always allowed pre-game — failing either condition
 * above only removes the refund, it never blocks the cancellation.
 */
import { describe, it, expect } from 'vitest';
import { evaluateCancellationEligibility, getInvoiceMonthEnd, getRefundDeadline, DEFAULT_CANCEL_CUTOFF_HOURS } from '@/lib/refund-policy';

describe('getInvoiceMonthEnd (pure calendar-month arithmetic)', () => {
  it('returns 23:59:59.999 IST on the 30th for a September payment', () => {
    const end = getInvoiceMonthEnd(new Date('2026-09-05T10:00:00+05:30'));
    expect(end.toISOString()).toBe(new Date('2026-09-30T23:59:59.999+05:30').toISOString());
  });

  it('resolves a 31 Aug payment to the August month end, not September', () => {
    // Paid on the last day of a 31-day month — must not roll into next month.
    const end = getInvoiceMonthEnd(new Date('2026-08-31T21:00:00+05:30'));
    expect(end.toISOString()).toBe(new Date('2026-08-31T23:59:59.999+05:30').toISOString());
  });

  it('handles February in a leap year (2028) correctly', () => {
    const end = getInvoiceMonthEnd(new Date('2028-02-10T00:00:00+05:30'));
    expect(end.toISOString()).toBe(new Date('2028-02-29T23:59:59.999+05:30').toISOString());
  });

  it('handles February in a non-leap year (2026) correctly', () => {
    const end = getInvoiceMonthEnd(new Date('2026-02-10T00:00:00+05:30'));
    expect(end.toISOString()).toBe(new Date('2026-02-28T23:59:59.999+05:30').toISOString());
  });

  it('handles a December payment rolling into a new year (year boundary)', () => {
    const end = getInvoiceMonthEnd(new Date('2026-12-15T00:00:00+05:30'));
    expect(end.toISOString()).toBe(new Date('2026-12-31T23:59:59.999+05:30').toISOString());
  });

  it('is computed from the IST calendar day, independent of the server/UTC day', () => {
    // 2026-08-31T20:00:00Z is already 2026-09-01 01:30 IST — must resolve to September, not August.
    const end = getInvoiceMonthEnd(new Date('2026-08-31T20:00:00Z'));
    expect(end.toISOString()).toBe(new Date('2026-09-30T23:59:59.999+05:30').toISOString());
  });
});

describe('getRefundDeadline (concrete deadline shown at checkout)', () => {
  it('the 5th Sep spec example: booking 10 Sep 6pm, paid 5 Sep -> deadline is the play-cutoff (well inside the invoice month)', () => {
    const bookingStart = new Date('2026-09-10T18:00:00+05:30');
    const invoiceMonthEnd = getInvoiceMonthEnd(new Date('2026-09-05T09:00:00+05:30'));
    const deadline = getRefundDeadline(bookingStart, invoiceMonthEnd, 24);
    expect(deadline.toISOString()).toBe(new Date('2026-09-09T18:00:00+05:30').toISOString());
  });

  it('booking 5 Sep 4pm -> refund deadline is exactly 24h earlier, 4 Sep 4pm', () => {
    const bookingStart = new Date('2026-09-05T16:00:00+05:30');
    const invoiceMonthEnd = getInvoiceMonthEnd(new Date('2026-09-01T09:00:00+05:30'));
    const deadline = getRefundDeadline(bookingStart, invoiceMonthEnd, 24);
    expect(deadline.toISOString()).toBe(new Date('2026-09-04T16:00:00+05:30').toISOString());
  });

  it('falls back to the invoice month end when that is the tighter constraint (far-future booking)', () => {
    const bookingStart = new Date('2026-12-25T18:00:00+05:30'); // months away
    const invoiceMonthEnd = getInvoiceMonthEnd(new Date('2026-09-05T09:00:00+05:30')); // 30 Sep 23:59:59
    const deadline = getRefundDeadline(bookingStart, invoiceMonthEnd, 24);
    expect(deadline.toISOString()).toBe(invoiceMonthEnd.toISOString());
  });

  it('31st -> 1st booking with a same-day-payment: deadline is before the payment instant itself (already-closed window)', () => {
    // Paid 31 Aug 18:00, playing 1 Sep 06:00 — 24h-before-play cutoff (31 Aug 06:00)
    // is earlier than the invoice month end (31 Aug 23:59:59.999), so the play
    // cutoff wins and the deadline sits before the payment ever happened.
    const bookingStart = new Date('2026-09-01T06:00:00+05:30');
    const invoiceMonthEnd = getInvoiceMonthEnd(new Date('2026-08-31T18:00:00+05:30'));
    const deadline = getRefundDeadline(bookingStart, invoiceMonthEnd, 24);
    expect(deadline.toISOString()).toBe(new Date('2026-08-31T06:00:00+05:30').toISOString());
  });
});

describe('evaluateCancellationEligibility — invoice-month + 24h combined policy', () => {
  it('the exact scenario from the spec: paid 5 Sep, refundable through 30 Sep', () => {
    const paymentDate = new Date('2026-09-05T09:00:00+05:30');

    // Cancelling on 29 Sep, for a booking on 5 Oct (>24h away) -> still within Sep, refund-eligible.
    const withinMonth = evaluateCancellationEligibility(
      '2026-10-05',
      ['18:00 - 19:00'],
      new Date('2026-09-29T12:00:00+05:30').getTime(),
      DEFAULT_CANCEL_CUTOFF_HOURS,
      paymentDate
    );
    expect(withinMonth.allowed).toBe(true);
    expect(withinMonth.refundEligible).toBe(true);
    expect(withinMonth.code).toBe('ELIGIBLE');

    // Cancelling on 1 Oct (after the Sep invoice month has closed), same future booking -> no refund, but still cancellable.
    const afterMonth = evaluateCancellationEligibility(
      '2026-10-05',
      ['18:00 - 19:00'],
      new Date('2026-10-01T00:00:01+05:30').getTime(),
      DEFAULT_CANCEL_CUTOFF_HOURS,
      paymentDate
    );
    expect(afterMonth.allowed).toBe(true);
    expect(afterMonth.refundEligible).toBe(false);
    expect(afterMonth.code).toBe('NO_REFUND_MONTH_EXPIRED');
  });

  it('booking made on the 31st for play on the 1st of next month: invoice month is the payment month, not the play month', () => {
    // Paid 31 Aug 18:00 IST, playing 1 Sep 06:00 IST — only 12h between payment and play,
    // so the 24h-before-play floor is already blown at the moment of payment.
    const paymentDate = new Date('2026-08-31T18:00:00+05:30');
    const now = paymentDate.getTime(); // evaluate right at payment time

    const evalResult = evaluateCancellationEligibility('2026-09-01', ['06:00 - 07:00'], now, DEFAULT_CANCEL_CUTOFF_HOURS, paymentDate);
    expect(evalResult.allowed).toBe(true);
    // Too close to play (< 24h) wins even though the invoice month (August) hasn't closed yet.
    expect(evalResult.refundEligible).toBe(false);
    expect(evalResult.code).toBe('NO_REFUND_LATE');
    expect(evalResult.invoiceMonthEnd.toISOString()).toBe(new Date('2026-08-31T23:59:59.999+05:30').toISOString());
  });

  it('booking made on the 31st for play on the 1st of next month, with enough lead time: refund-eligible until 31 Aug 23:59:59 IST', () => {
    // Paid 31 Aug 00:30 IST, playing 1 Sep 23:00 IST — well over 24h of lead time.
    const paymentDate = new Date('2026-08-31T00:30:00+05:30');

    // Cancel same day, 31 Aug 10:00 IST — within invoice month, >24h before play.
    const early = evaluateCancellationEligibility(
      '2026-09-01',
      ['23:00 - 23:59'],
      new Date('2026-08-31T10:00:00+05:30').getTime(),
      DEFAULT_CANCEL_CUTOFF_HOURS,
      paymentDate
    );
    expect(early.refundEligible).toBe(true);

    // Cancel 1 Sep 00:00:01 IST, for a booking on 5 Sep (still comfortably >24h
    // away) — isolates the month-expiry condition from the before-play cutoff.
    const late = evaluateCancellationEligibility(
      '2026-09-05',
      ['23:00 - 23:59'],
      new Date('2026-09-01T00:00:01+05:30').getTime(),
      DEFAULT_CANCEL_CUTOFF_HOURS,
      paymentDate
    );
    expect(late.allowed).toBe(true);
    expect(late.refundEligible).toBe(false);
    expect(late.code).toBe('NO_REFUND_MONTH_EXPIRED');
  });

  it('is refund-eligible at the exact invoice-month-end instant (23:59:59.999 IST)', () => {
    const paymentDate = new Date('2026-09-05T09:00:00+05:30');
    const monthEnd = getInvoiceMonthEnd(paymentDate);

    const result = evaluateCancellationEligibility(
      '2026-12-25',
      ['18:00 - 19:00'],
      monthEnd.getTime(),
      DEFAULT_CANCEL_CUTOFF_HOURS,
      paymentDate
    );
    expect(result.refundEligible).toBe(true);
  });

  it('is NOT refund-eligible one millisecond after the invoice-month-end instant', () => {
    const paymentDate = new Date('2026-09-05T09:00:00+05:30');
    const monthEnd = getInvoiceMonthEnd(paymentDate);

    const result = evaluateCancellationEligibility(
      '2026-12-25',
      ['18:00 - 19:00'],
      monthEnd.getTime() + 1,
      DEFAULT_CANCEL_CUTOFF_HOURS,
      paymentDate
    );
    expect(result.allowed).toBe(true);
    expect(result.refundEligible).toBe(false);
    expect(result.code).toBe('NO_REFUND_MONTH_EXPIRED');
  });

  it('a same-day booking (paid and played same day) is only refund-eligible if >=24h of lead time existed', () => {
    const paymentDate = new Date('2026-09-10T08:00:00+05:30');

    // Booked for 09:00 the same day it was paid for (08:00) — 1h lead time only.
    const result = evaluateCancellationEligibility('2026-09-10', ['09:00 - 10:00'], paymentDate.getTime(), DEFAULT_CANCEL_CUTOFF_HOURS, paymentDate);
    expect(result.allowed).toBe(true);
    expect(result.refundEligible).toBe(false);
    expect(result.code).toBe('NO_REFUND_LATE');
  });

  it('a booking far in the future stays refund-eligible right up to the invoice month end, then flips permanently', () => {
    const paymentDate = new Date('2026-01-15T09:00:00+05:30'); // paid mid-January
    const farFutureBooking = '2026-12-25'; // played in December — miles beyond 24h either way

    const stillJanuary = evaluateCancellationEligibility(
      farFutureBooking,
      ['18:00 - 19:00'],
      new Date('2026-01-31T23:59:59+05:30').getTime(),
      DEFAULT_CANCEL_CUTOFF_HOURS,
      paymentDate
    );
    expect(stillJanuary.refundEligible).toBe(true);

    const nowFebruary = evaluateCancellationEligibility(
      farFutureBooking,
      ['18:00 - 19:00'],
      new Date('2026-02-01T00:00:00+05:30').getTime(),
      DEFAULT_CANCEL_CUTOFF_HOURS,
      paymentDate
    );
    expect(nowFebruary.allowed).toBe(true);
    expect(nowFebruary.refundEligible).toBe(false);
    expect(nowFebruary.code).toBe('NO_REFUND_MONTH_EXPIRED');
  });

  it('cancellation stays available (with no refund) even after the game has started, up until it ends', () => {
    const paymentDate = new Date('2026-09-05T09:00:00+05:30');
    // Game 18:00-19:00, evaluating at 18:30 (in progress).
    const inProgress = evaluateCancellationEligibility(
      '2026-09-05',
      ['18:00 - 19:00'],
      new Date('2026-09-05T18:30:00+05:30').getTime(),
      DEFAULT_CANCEL_CUTOFF_HOURS,
      paymentDate
    );
    expect(inProgress.allowed).toBe(true);
    expect(inProgress.refundEligible).toBe(false);

    // Once the game has ended (19:01), cancellation is rejected outright.
    const ended = evaluateCancellationEligibility(
      '2026-09-05',
      ['18:00 - 19:00'],
      new Date('2026-09-05T19:01:00+05:30').getTime(),
      DEFAULT_CANCEL_CUTOFF_HOURS,
      paymentDate
    );
    expect(ended.allowed).toBe(false);
    expect(ended.code).toBe('PAST_BOOKING');
  });

  it('paymentDate defaults to `now` when omitted, so the invoice-month check never blocks callers that only care about the before-play cutoff', () => {
    const now = new Date('2026-09-05T09:00:00+05:30').getTime();
    const result = evaluateCancellationEligibility('2026-09-10', ['18:00 - 19:00'], now, DEFAULT_CANCEL_CUTOFF_HOURS);
    expect(result.refundEligible).toBe(true);
  });
});
