import { describe, it, expect, assert } from 'vitest';
import { evaluateCancellationEligibility, calculateRefundAmount } from '../../lib/refund-policy';

describe('Dynamic Cancellation Cutoff Policy', () => {
  const BASE_NOW = new Date('2026-07-29T12:00:00+05:30').getTime(); // noon

  it('evaluates with cutoff = 3 (default)', () => {
    // 3h + 1m => 15:01
    const eligibleSlot = '15:01 - 16:01';
    const evalEligible = evaluateCancellationEligibility('2026-07-29', [eligibleSlot], BASE_NOW, 3);
    assert(evalEligible.allowed === true, '3h + 1m should be ELIGIBLE');

    // 3h - 1m => 14:59
    const rejectedSlot = '14:59 - 15:59';
    const evalRejected = evaluateCancellationEligibility('2026-07-29', [rejectedSlot], BASE_NOW, 3);
    assert(evalRejected.allowed === false, '3h - 1m should be REJECTED');
  });

  it('evaluates with cutoff = 6', () => {
    // 6h + 1m => 18:01
    const eligibleSlot = '18:01 - 19:01';
    const evalEligible = evaluateCancellationEligibility('2026-07-29', [eligibleSlot], BASE_NOW, 6);
    assert(evalEligible.allowed === true, '6h + 1m should be ELIGIBLE');

    // 6h - 1m => 17:59
    const rejectedSlot = '17:59 - 18:59';
    const evalRejected = evaluateCancellationEligibility('2026-07-29', [rejectedSlot], BASE_NOW, 6);
    assert(evalRejected.allowed === false, '6h - 1m should be REJECTED');
  });

  it('evaluates with cutoff = 12', () => {
    // 12h + 1m => 00:01 next day => 2026-07-30
    const eligibleSlot = '00:01 - 01:01';
    const evalEligible = evaluateCancellationEligibility('2026-07-30', [eligibleSlot], BASE_NOW, 12);
    assert(evalEligible.allowed === true, '12h + 1m should be ELIGIBLE');

    // 12h - 1m => 23:59 same day
    const rejectedSlot = '23:59 - 00:59';
    const evalRejected = evaluateCancellationEligibility('2026-07-29', [rejectedSlot], BASE_NOW, 12);
    assert(evalRejected.allowed === false, '12h - 1m should be REJECTED');
  });

  it('evaluates past bookings as rejected regardless of cutoff setting', () => {
    // Past booking => 2025-01-01
    const evalPast = evaluateCancellationEligibility('2025-01-01', ['10:00 - 11:00'], BASE_NOW, 12);
    assert(evalPast.allowed === false, 'Past booking must be rejected regardless of setting');
    expect(evalPast.code).toBe('PAST_BOOKING');
  });

  it('ensures existing 5% calculation remains unchanged', () => {
    const { grossAmount, serviceFee, refundAmount } = calculateRefundAmount(1000);
    expect(grossAmount).toBe(1000);
    expect(serviceFee).toBe(50);
    expect(refundAmount).toBe(950);
  });
});
