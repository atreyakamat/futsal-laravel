import { describe, it, expect, assert } from 'vitest';
import { evaluateCancellationEligibility, calculateRefundAmount } from '../../lib/refund-policy';

describe('Dynamic Cancellation Cutoff Policy', () => {
  const BASE_NOW = new Date('2026-07-29T12:00:00+05:30').getTime(); // noon

  // Cancellation itself is always allowed pre-game since 2026-08-28 — only
  // refund eligibility is gated by cutoffHours (plus the invoice-month cap,
  // trivially satisfied here since paymentDate defaults to `now`).

  it('evaluates with cutoff = 3', () => {
    // 3h + 1m => 15:01
    const eligibleSlot = '15:01 - 16:01';
    const evalEligible = evaluateCancellationEligibility('2026-07-29', [eligibleSlot], BASE_NOW, 3);
    assert(evalEligible.allowed === true && evalEligible.refundEligible === true, '3h + 1m should be refund-ELIGIBLE');

    // 3h - 1m => 14:59
    const rejectedSlot = '14:59 - 15:59';
    const evalRejected = evaluateCancellationEligibility('2026-07-29', [rejectedSlot], BASE_NOW, 3);
    assert(evalRejected.allowed === true, '3h - 1m is still cancellable');
    assert(evalRejected.refundEligible === false, '3h - 1m should be refund-REJECTED');
  });

  it('evaluates with cutoff = 6', () => {
    // 6h + 1m => 18:01
    const eligibleSlot = '18:01 - 19:01';
    const evalEligible = evaluateCancellationEligibility('2026-07-29', [eligibleSlot], BASE_NOW, 6);
    assert(evalEligible.refundEligible === true, '6h + 1m should be refund-ELIGIBLE');

    // 6h - 1m => 17:59
    const rejectedSlot = '17:59 - 18:59';
    const evalRejected = evaluateCancellationEligibility('2026-07-29', [rejectedSlot], BASE_NOW, 6);
    assert(evalRejected.allowed === true, '6h - 1m is still cancellable');
    assert(evalRejected.refundEligible === false, '6h - 1m should be refund-REJECTED');
  });

  it('evaluates with cutoff = 24 (the enforced floor)', () => {
    // 24h + 1m
    const eligibleSlot = '12:01 - 13:01';
    const evalEligible = evaluateCancellationEligibility('2026-07-30', [eligibleSlot], BASE_NOW, 24);
    assert(evalEligible.refundEligible === true, '24h + 1m should be refund-ELIGIBLE');

    // 24h - 1m
    const rejectedSlot = '11:59 - 12:59';
    const evalRejected = evaluateCancellationEligibility('2026-07-30', [rejectedSlot], BASE_NOW, 24);
    assert(evalRejected.allowed === true, '24h - 1m is still cancellable');
    assert(evalRejected.refundEligible === false, '24h - 1m should be refund-REJECTED');
    expect(evalRejected.code).toBe('NO_REFUND_LATE');
  });

  it('evaluates past bookings as rejected regardless of cutoff setting', () => {
    // Past booking => 2025-01-01
    const evalPast = evaluateCancellationEligibility('2025-01-01', ['10:00 - 11:00'], BASE_NOW, 12);
    assert(evalPast.allowed === false, 'Past booking must be rejected regardless of setting');
    assert(evalPast.refundEligible === false, 'Past booking is never refund-eligible');
    expect(evalPast.code).toBe('PAST_BOOKING');
  });

  it('ensures existing 5% calculation remains unchanged', () => {
    const { grossAmount, serviceFee, refundAmount } = calculateRefundAmount(1000);
    expect(grossAmount).toBe(1000);
    expect(serviceFee).toBe(50);
    expect(refundAmount).toBe(950);
  });
});
