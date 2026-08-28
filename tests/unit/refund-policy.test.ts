import { describe, it, expect } from 'vitest';
import {
  calculateRefundAmount,
  isCancellationAllowed,
  REFUND_SERVICE_FEE_PCT,
  DEFAULT_CANCEL_CUTOFF_HOURS,
  MIN_CANCEL_CUTOFF_HOURS,
} from '@/lib/refund-policy';

describe('Refund Policy Unit Tests', () => {
  it('should have correct policy constants', () => {
    expect(REFUND_SERVICE_FEE_PCT).toBe(5);
    expect(DEFAULT_CANCEL_CUTOFF_HOURS).toBe(24);
    expect(MIN_CANCEL_CUTOFF_HOURS).toBe(24);
  });

  describe('calculateRefundAmount', () => {
    it('should correctly calculate 5% fee and net refund for integer amount', () => {
      const result = calculateRefundAmount(1000);
      expect(result.grossAmount).toBe(1000);
      expect(result.serviceFee).toBe(50);
      expect(result.refundAmount).toBe(950);
    });

    it('should correctly calculate 5% fee and net refund for decimal amount', () => {
      const result = calculateRefundAmount(550);
      expect(result.grossAmount).toBe(550);
      expect(result.serviceFee).toBe(27.5);
      expect(result.refundAmount).toBe(522.5);
    });

    it('should handle zero gross amount', () => {
      const result = calculateRefundAmount(0);
      expect(result.grossAmount).toBe(0);
      expect(result.serviceFee).toBe(0);
      expect(result.refundAmount).toBe(0);
    });
  });

  describe('isCancellationAllowed', () => {
    // Cancellation is always allowed pre-game since 2026-08-28 — `allowed`
    // only turns false for a past/completed booking. `refundEligible` is
    // the part gated by the (now 24h default/floor) cutoff.
    it('should be refund-eligible if slot is >= 24 hours in the future', () => {
      const targetTime = new Date(Date.now() + 25 * 60 * 60 * 1000);
      const istDateStr = targetTime.toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
      const istTimeStr = targetTime.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

      const check = isCancellationAllowed(istDateStr, istTimeStr);
      expect(check.allowed).toBe(true);
      expect(check.refundEligible).toBe(true);
      expect(check.msUntilBooking).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000 - 1000);
    });

    it('should still allow cancellation, but not a refund, if slot is < 24 hours in the future', () => {
      const targetTime = new Date(Date.now() + 1 * 60 * 60 * 1000);
      const istDateStr = targetTime.toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });
      const istTimeStr = targetTime.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

      const check = isCancellationAllowed(istDateStr, istTimeStr);
      expect(check.allowed).toBe(true);
      expect(check.refundEligible).toBe(false);
    });

    it('should support full range string inputs like "06:00 - 07:00"', () => {
      const targetTime = new Date(Date.now() + 30 * 60 * 60 * 1000);
      const istDateStr = targetTime.toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });
      const istTimeStr = targetTime.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

      const check = isCancellationAllowed(istDateStr, `${istTimeStr} - 08:00`);
      expect(check.allowed).toBe(true);
      expect(check.refundEligible).toBe(true);
    });
  });
});
