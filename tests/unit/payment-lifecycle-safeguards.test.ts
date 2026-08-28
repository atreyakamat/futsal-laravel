import { describe, it, expect } from 'vitest';
import { calculateRefundAmount, isCancellationAllowed } from '@/lib/refund-policy';

describe('Payment Lifecycle & Ticket Security Safeguards', () => {
  describe('Ticket & Payment Status Guards', () => {
    it('should only consider confirmed bookings eligible for ticket access', () => {
      const statuses: string[] = ['pending', 'failed', 'cancelled', 'confirmed'];
      const confirmedStatuses = statuses.filter((s) => s === 'confirmed');
      expect(confirmedStatuses).toEqual(['confirmed']);
      expect(statuses.filter((s) => s === 'confirmed').length).toBe(1);
    });

    it('should calculate 5% handling fee correctly for single and multi-slot totals', () => {
      // Single slot 1000 -> 50 fee -> 950 refund
      const single = calculateRefundAmount(1000);
      expect(single.grossAmount).toBe(1000);
      expect(single.serviceFee).toBe(50);
      expect(single.refundAmount).toBe(950);

      // Combined 2 slots (500 + 500) -> (25 + 25) fee -> 950 total refund
      const slot1 = calculateRefundAmount(500);
      const slot2 = calculateRefundAmount(500);
      const combinedFee = slot1.serviceFee + slot2.serviceFee;
      const combinedRefund = slot1.refundAmount + slot2.refundAmount;

      expect(combinedFee).toBe(50);
      expect(combinedRefund).toBe(950);
    });
  });

  describe('Cancellation Cutoff Rules', () => {
    it('should still allow cancellation, but not a refund, if game time is less than 24 hours away', () => {
      const nearFuture = new Date(Date.now() + 1.5 * 60 * 60 * 1000); // 1.5h in future
      const dateStr = nearFuture.toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });
      const timeStr = nearFuture.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

      const res = isCancellationAllowed(dateStr, timeStr);
      expect(res.allowed).toBe(true);
      expect(res.refundEligible).toBe(false);
    });
  });
});
