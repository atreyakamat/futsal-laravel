/**
 * STATE-MACHINE-REGRESSION: Refund lifecycle state machine
 *
 * Regression guard for Fix 1 in lib/refund-policy.ts:
 *   Premature REFUNDED state was returned when:
 *     payment_status = 'cancelled' AND refund_amount > 0
 *   regardless of refund_status.
 *
 * The fix removes that condition so that:
 *   - refund_status = 'INITIATED'  → PROCESSING (not REFUNDED)
 *   - refund_status = 'PENDING'    → pending (not REFUNGED)
 *   - refund_status missing/null   → not REFUNDED
 *
 * Evidence rule: All assertions below use in-process pure-function
 * evaluation — no mocked PayU, no sandbox identifiers.
 *
 * LIVE PAYU: PENDING — sandbox only
 */
import { describe, it, expect } from 'vitest';
import { computeRefundLifecycleStatus } from '@/lib/refund-policy';

function baseBooking(overrides: Record<string, any> = {}) {
  return {
    payment_status: 'confirmed',
    cancellation_requested: true,
    refund_amount: null,
    refund_status: null,
    cancellation_reason: null,
    ...overrides,
  };
}

describe('STATE-MACHINE-REGRESSION: computeRefundLifecycleStatus', () => {
  // ── 1. PENDING_REVIEW ──────────────────────────────────────────
  describe('1. PENDING_REVIEW', () => {
    it('returns PENDING_REVIEW for explicit PENDING_REVIEW status', () => {
      const r = computeRefundLifecycleStatus(baseBooking({ refund_status: 'PENDING_REVIEW' }));
      expect(r.status).toBe('PENDING_REVIEW');
      expect(r.isPending).toBe(true);
      expect(r.isRefunded).toBe(false);
    });
  });

  // ── 2. INITIATED ───────────────────────────────────────────────
  // CRITICAL: This is the bug that was fixed.
  describe('2. INITIATED', () => {
    it('CRITICAL: cancelled + refund_amount>0 + INITIATED MUST NOT be REFUNDED', () => {
      const r = computeRefundLifecycleStatus(
        baseBooking({
          payment_status: 'cancelled',
          refund_amount: 1900,
          refund_status: 'INITIATED',
        })
      );
      expect(r.status).not.toBe('REFUNDED');
      expect(r.isRefunded).toBe(false);
      expect(r.status).toBe('PROCESSING');
      expect(r.isProcessing).toBe(true);
    });

    it('INITIATED + confirmed payment → PROCESSING (not REFUNDED)', () => {
      const r = computeRefundLifecycleStatus(baseBooking({
        payment_status: 'confirmed',
        refund_amount: 1900,
        refund_status: 'INITIATED',
      }));
      expect(r.status).not.toBe('REFUNDED');
      expect(r.isRefunded).toBe(false);
      expect(r.status).toBe('PROCESSING');
      expect(r.isProcessing).toBe(true);
    });

    it('INITIATED + zero refund_amount → PROCESSING (not REFUNDED)', () => {
      const r = computeRefundLifecycleStatus(baseBooking({
        payment_status: 'cancelled',
        refund_amount: 0,
        refund_status: 'INITIATED',
      }));
      expect(r.status).not.toBe('REFUNDED');
      expect(r.isRefunded).toBe(false);
      expect(r.status).toBe('PROCESSING');
    });
  });

  // ── 3. PROCESSING ──────────────────────────────────────────────
  describe('3. PROCESSING', () => {
    it('PROCESSING stays PROCESSING', () => {
      const r = computeRefundLifecycleStatus(baseBooking({
        payment_status: 'cancelled',
        refund_amount: 1900,
        refund_status: 'PROCESSING',
      }));
      expect(r.status).toBe('PROCESSING');
      expect(r.isRefunded).toBe(false);
      expect(r.isProcessing).toBe(true);
    });
  });

  // ── 4. PENDING ─────────────────────────────────────────────────
  describe('4. PENDING', () => {
    it('PENDING stays pending (falls to PENDING_REVIEW), never REFUNDED', () => {
      const r = computeRefundLifecycleStatus(baseBooking({
        payment_status: 'cancelled',
        refund_amount: 1900,
        refund_status: 'PENDING',
      }));
      expect(r.status).not.toBe('REFUNDED');
      expect(r.isRefunded).toBe(false);
      expect(r.isPending).toBe(true);
    });
  });

  // ── 5. REFUNDED ────────────────────────────────────────────────
  describe('5. REFUNDED', () => {
    it('REFUNDED + payment_status=refunded → REFUNDED', () => {
      const r = computeRefundLifecycleStatus(baseBooking({
        payment_status: 'refunded',
        refund_amount: 1900,
        refund_status: 'REFUNDED',
      }));
      expect(r.status).toBe('REFUNDED');
      expect(r.isRefunded).toBe(true);
    });

    it('explicit REFUNDED refund_status → REFUNDED regardless of payment_status', () => {
      const r = computeRefundLifecycleStatus(baseBooking({
        payment_status: 'cancelled',
        refund_amount: 1900,
        refund_status: 'REFUNDED',
      }));
      expect(r.status).toBe('REFUNDED');
      expect(r.isRefunded).toBe(true);
    });
  });

  // ── 6. REJECTED ────────────────────────────────────────────────
  describe('6. REJECTED', () => {
    it('REJECTED refund_status → REJECTED', () => {
      const r = computeRefundLifecycleStatus(baseBooking({
        payment_status: 'cancelled',
        refund_amount: 1900,
        refund_status: 'REJECTED',
        cancellation_reason: 'REJECTED: Outside policy window',
      }));
      expect(r.status).toBe('REJECTED');
      expect(r.isRejected).toBe(true);
      expect(r.isRefunded).toBe(false);
    });

    it('cancellation_reason starting with REJECTED → REJECTED', () => {
      const r = computeRefundLifecycleStatus(baseBooking({
        payment_status: 'confirmed',
        cancellation_requested: true,
        cancellation_reason: 'REJECTED: Time cutoff violation',
      }));
      expect(r.status).toBe('REJECTED');
      expect(r.isRejected).toBe(true);
    });
  });

  // ── 7. FAILED ──────────────────────────────────────────────────
  describe('7. FAILED', () => {
    it('FAILED refund_status → NOT REFUNDED (falls to PENDING_REVIEW)', () => {
      const r = computeRefundLifecycleStatus(baseBooking({
        payment_status: 'cancelled',
        refund_amount: 1900,
        refund_status: 'FAILED',
      }));
      expect(r.status).not.toBe('REFUNDED');
      expect(r.isRefunded).toBe(false);
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────
  describe('Edge cases', () => {
    it('missing refund_status + cancelled + refund_amount>0 → NOT REFUNDED', () => {
      const r = computeRefundLifecycleStatus({
        payment_status: 'cancelled',
        refund_amount: 1900,
        cancellation_reason: null,
      });
      expect(r.status).not.toBe('REFUNDED');
      expect(r.isRefunded).toBe(false);
    });

    it('null refund_status + cancelled + refund_amount>0 → NOT REFUNDED', () => {
      const r = computeRefundLifecycleStatus(baseBooking({
        payment_status: 'cancelled',
        refund_amount: 1900,
        refund_status: null,
      }));
      expect(r.status).not.toBe('REFUNDED');
      expect(r.isRefunded).toBe(false);
    });

    it('zero refund_amount + cancelled → NOT REFUNDED', () => {
      const r = computeRefundLifecycleStatus(baseBooking({
        payment_status: 'cancelled',
        refund_amount: 0,
      }));
      expect(r.status).not.toBe('REFUNDED');
      expect(r.isRefunded).toBe(false);
    });

    it('positive refund_amount + confirmed payment + no refund_status → NOT REFUNDED', () => {
      const r = computeRefundLifecycleStatus(baseBooking({
        payment_status: 'confirmed',
        refund_amount: 1900,
      }));
      expect(r.status).not.toBe('REFUNDED');
      expect(r.isRefunded).toBe(false);
    });

    it('inconsistent: refund_status=REFUNDED but payment_status=cancelled + refund_amount=0 → still REFUNDED', () => {
      const r = computeRefundLifecycleStatus(baseBooking({
        payment_status: 'cancelled',
        refund_amount: 0,
        refund_status: 'REFUNDED',
      }));
      expect(r.status).toBe('REFUNDED');
      expect(r.isRefunded).toBe(true);
    });

    it('empty string refund_status → NOT REFUNDED (default PENDING_REVIEW)', () => {
      const r = computeRefundLifecycleStatus(baseBooking({
        payment_status: 'cancelled',
        refund_amount: 1900,
        refund_status: '',
      }));
      expect(r.status).not.toBe('REFUNDED');
      expect(r.isRefunded).toBe(false);
    });

    it('lowercase initiated refund_status → PROCESSING (case-insensitive)', () => {
      const r = computeRefundLifecycleStatus(baseBooking({
        payment_status: 'cancelled',
        refund_amount: 1900,
        refund_status: 'initiated',
      }));
      expect(r.status).toBe('PROCESSING');
      expect(r.isRefunded).toBe(false);
    });

    it('APPROVED refund_status → APPROVED (not REFUNDED)', () => {
      const r = computeRefundLifecycleStatus(baseBooking({
        payment_status: 'cancelled',
        refund_amount: 1900,
        refund_status: 'APPROVED',
      }));
      expect(r.status).toBe('APPROVED');
      expect(r.isRefunded).toBe(false);
      expect(r.isApproved).toBe(true);
    });
  });

  // ── Comprehensive sweep: cancelled + refund_amount>0 must NEVER auto-REFUNDED ──
  describe('Comprehensive: cancelled + refund_amount>0 must never auto-promote to REFUNDED', () => {
    const dangerousStatuses = [
      'INITIATED',
      'PENDING',
      'PROCESSING',
      'PENDING_REVIEW',
      'APPROVED',
      'FAILED',
      '',
      null,
      undefined,
    ];

    for (const status of dangerousStatuses) {
      it(`refund_status=${JSON.stringify(status)} → NOT REFUNDED`, () => {
        const r = computeRefundLifecycleStatus(baseBooking({
          payment_status: 'cancelled',
          refund_amount: 1900,
          refund_status: status as any,
        }));
        expect(r.status).not.toBe('REFUNDED');
        expect(r.isRefunded).toBe(false);
      });
    }

    it('only explicit REFUNDED status → REFUNDED', () => {
      const r = computeRefundLifecycleStatus(baseBooking({
        payment_status: 'cancelled',
        refund_amount: 1900,
        refund_status: 'REFUNDED',
      }));
      expect(r.status).toBe('REFUNDED');
      expect(r.isRefunded).toBe(true);
    });

    it('or payment_status === "refunded" → REFUNDED', () => {
      const r = computeRefundLifecycleStatus(baseBooking({
        payment_status: 'refunded',
        refund_amount: 1900,
        refund_status: 'INITIATED',
      }));
      expect(r.status).toBe('REFUNDED');
      expect(r.isRefunded).toBe(true);
    });
  });
});
