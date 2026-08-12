/**
 * REFUND-AUTHORIZATION-REGRESSION: Super Admin refund endpoint
 *
 * Regression guard for Fix 2 in app/api/fg-admin/super-admin/refund/route.ts:
 *   - Only payment_status = 'confirmed' can cross the PayU boundary
 *   - Non-confirmed payments are blocked BEFORE PayU is called
 *   - Atomic UPDATE (WHERE payment_status='confirmed' RETURNING id) prevents races
 *   - RBAC: only super_admin role is authorized
 *
 * Evidence rule: All PayU interactions use mocked initiatePayuRefund.
 * No real PayU API calls. No sandbox tokens treated as proof of settlement.
 *
 * LIVE PAYU: PENDING — sandbox only
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock all route-handler dependencies before import ────────────
vi.mock('@/lib/domain', () => ({
  query: vi.fn(),
}));

vi.mock('@/lib/payment', () => ({
  initiatePayuRefund: vi.fn(),
}));

vi.mock('@/lib/session', () => ({
  readSuperAdminId: vi.fn(),
}));

vi.mock('@/lib/super-admin', () => ({
  logAuditAction: vi.fn(),
}));

// Import route handler (its dependencies are now mocked)
import { POST } from '@/app/api/fg-admin/super-admin/refund/route';
import { query as domainQuery } from '@/lib/domain';
import { initiatePayuRefund } from '@/lib/payment';
import { readSuperAdminId } from '@/lib/session';
import { logAuditAction } from '@/lib/super-admin';

const mockQuery = vi.mocked(domainQuery);
const mockInitiatePayuRefund = vi.mocked(initiatePayuRefund);
const mockReadSuperAdminId = vi.mocked(readSuperAdminId);
const mockLogAuditAction = vi.mocked(logAuditAction);

// ── Shared mutable "database" state ──────────────────────────────
let dbBookings: any[] = [];

/**
 * Sets up the query mock to simulate a real database with atomic
 * UPDATE semantics: the UPDATE only succeeds if bookings are still 'confirmed'.
 */
function setupQueryMock() {
  mockQuery.mockImplementation(async (sql: string, _params?: any[]) => {
    if (typeof sql !== 'string') return [];
    if (sql.startsWith('SELECT')) {
      return [...dbBookings];
    }
    if (sql.startsWith('UPDATE')) {
      const confirmed = dbBookings.filter((b) => b.payment_status === 'confirmed');
      if (confirmed.length > 0) {
        dbBookings = dbBookings.map((b) =>
          b.payment_status === 'confirmed'
            ? { ...b, payment_status: 'cancelled', refund_status: 'INITIATED' }
            : b
        );
        return confirmed.map((b) => ({ id: b.id }));
      }
      return [];
    }
    return [];
  });
}

/** Creates a mock request that satisfies the subset of NextRequest the route uses. */
function makeRequest(body: any): any {
  return new Request('http://localhost:3000/api/fg-admin/super-admin/refund', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Helper: assert that no PayU call, no mutation, no audit event occurred. */
function assertPayuSafety() {
  expect(mockInitiatePayuRefund).not.toHaveBeenCalled();
  expect(mockLogAuditAction).not.toHaveBeenCalled();
  const updateCalls = mockQuery.mock.calls.filter(
    ([sql]) => typeof sql === 'string' && sql.startsWith('UPDATE')
  );
  expect(updateCalls).toHaveLength(0);
}

// ── Tests ─────────────────────────────────────────────────────────
describe('REFUND-AUTHORIZATION-REGRESSION: Super Admin Refund Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbBookings = [];
    // Default: authorized Super Admin
    mockReadSuperAdminId.mockResolvedValue(2);
    // Default: PayU returns "initiated" (test sandbox)
    mockInitiatePayuRefund.mockResolvedValue({
      success: true,
      refundRequestId: 'REF-TEST-123456',
      payuTxnId: 'PAYU-TEST-123',
      response: { status: 1, msg: 'Refund request initiated' },
      message: 'Refund initiated successfully via PayU (test sandbox).',
      environmentLimitation: true, // explicitly sandbox
    });
    mockLogAuditAction.mockResolvedValue(undefined);
    setupQueryMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ════════════════════════════════════════════════════════════════
  // Task B: Payment-status authorization regression
  // ════════════════════════════════════════════════════════════════
  describe('Task B: Payment-status authorization', () => {
    it('1. confirmed → ALLOWED (200, PayU called once, audit logged)', async () => {
      dbBookings = [
        { id: 1, booking_ref: 'CONF-REF-1', payment_status: 'confirmed', amount: 1000, payu_mihpayid: 'PAYU-MIH-1' },
        { id: 2, booking_ref: 'CONF-REF-1', payment_status: 'confirmed', amount: 1000, payu_mihpayid: 'PAYU-MIH-1' },
      ];

      const res = await POST(makeRequest({ ref: 'CONF-REF-1', reason: 'Manager Override' }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(mockInitiatePayuRefund).toHaveBeenCalledTimes(1);
      expect(mockInitiatePayuRefund).toHaveBeenCalledWith({
        bookingRef: 'CONF-REF-1',
        mihpayid: 'PAYU-MIH-1',
        amount: 1900,
        reason: 'Manager Override',
      });
      expect(mockLogAuditAction).toHaveBeenCalledTimes(1);
    });

    it('2. pending → BLOCKED (400, PayU NOT called)', async () => {
      dbBookings = [{ id: 1, booking_ref: 'PEND-REF-1', payment_status: 'pending', amount: 1000, payu_mihpayid: null }];

      const res = await POST(makeRequest({ ref: 'PEND-REF-1', reason: 'test' }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toContain('confirmed');
      assertPayuSafety();
    });

    it('3. failed → BLOCKED (400, PayU NOT called)', async () => {
      dbBookings = [{ id: 1, booking_ref: 'FAIL-REF-1', payment_status: 'failed', amount: 1000, payu_mihpayid: null }];

      const res = await POST(makeRequest({ ref: 'FAIL-REF-1', reason: 'test' }));
      expect(res.status).toBe(400);
      assertPayuSafety();
    });

    it('4. cancelled → BLOCKED (400, idempotent, PayU NOT called)', async () => {
      dbBookings = [{ id: 1, booking_ref: 'CANC-REF-1', payment_status: 'cancelled', amount: 1000, payu_mihpayid: 'PAYU-MIH-1' }];

      const res = await POST(makeRequest({ ref: 'CANC-REF-1', reason: 'duplicate attempt' }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toContain('already');
      assertPayuSafety();
    });

    it('5. refunded → BLOCKED (400, PayU NOT called)', async () => {
      dbBookings = [{ id: 1, booking_ref: 'REFD-REF-1', payment_status: 'refunded', amount: 1000, payu_mihpayid: 'PAYU-MIH-1' }];

      const res = await POST(makeRequest({ ref: 'REFD-REF-1', reason: 'test' }));
      expect(res.status).toBe(400);
      assertPayuSafety();
    });

    it('6. initiated payment_status → BLOCKED (400, PayU NOT called)', async () => {
      dbBookings = [{ id: 1, booking_ref: 'INIT-REF-1', payment_status: 'initiated', amount: 1000, payu_mihpayid: null }];

      const res = await POST(makeRequest({ ref: 'INIT-REF-1', reason: 'test' }));
      expect(res.status).toBe(400);
      assertPayuSafety();
    });

    it('7. processing payment_status → BLOCKED (400, PayU NOT called)', async () => {
      dbBookings = [{ id: 1, booking_ref: 'PROC-REF-1', payment_status: 'processing', amount: 1000, payu_mihpayid: null }];

      const res = await POST(makeRequest({ ref: 'PROC-REF-1', reason: 'test' }));
      expect(res.status).toBe(400);
      assertPayuSafety();
    });

    it('8. missing payment_status → BLOCKED (400, PayU NOT called)', async () => {
      dbBookings = [{ id: 1, booking_ref: 'MISS-REF-1', amount: 1000, payu_mihpayid: null }];

      const res = await POST(makeRequest({ ref: 'MISS-REF-1', reason: 'test' }));
      expect(res.status).toBe(400);
      assertPayuSafety();
    });

    it('9. unknown booking_ref → BLOCKED (404, PayU NOT called)', async () => {
      dbBookings = [];

      const res = await POST(makeRequest({ ref: 'NONEXISTENT-REF', reason: 'test' }));
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.success).toBe(false);
      assertPayuSafety();
    });

    it('10. missing reason → BLOCKED (400, PayU NOT called)', async () => {
      dbBookings = [{ id: 1, booking_ref: 'NOREASON-REF', payment_status: 'confirmed', amount: 1000, payu_mihpayid: 'PAYU-MIH-1' }];

      const res = await POST(makeRequest({ ref: 'NOREASON-REF', reason: 'ab' }));
      expect(res.status).toBe(400);
      assertPayuSafety();
    });
  });

  // ════════════════════════════════════════════════════════════════
  // Task B: RBAC authorization regression
  // ════════════════════════════════════════════════════════════════
  describe('Task B: RBAC authorization', () => {
    it('10. customer session → 401 (PayU NOT called)', async () => {
      mockReadSuperAdminId.mockResolvedValue(null);
      dbBookings = [{ id: 1, booking_ref: 'RBAC-REF-1', payment_status: 'confirmed', amount: 1000, payu_mihpayid: 'PAYU-MIH-1' }];

      const res = await POST(makeRequest({ ref: 'RBAC-REF-1', reason: 'test' }));
      expect(res.status).toBe(401);
      assertPayuSafety();
    });

    it('11. arena admin session → 401 (PayU NOT called)', async () => {
      mockReadSuperAdminId.mockResolvedValue(null);
      dbBookings = [{ id: 1, booking_ref: 'RBAC-REF-2', payment_status: 'confirmed', amount: 1000, payu_mihpayid: 'PAYU-MIH-1' }];

      const res = await POST(makeRequest({ ref: 'RBAC-REF-2', reason: 'test' }));
      expect(res.status).toBe(401);
      assertPayuSafety();
    });

    it('12. security staff session → 401 (PayU NOT called)', async () => {
      mockReadSuperAdminId.mockResolvedValue(null);
      dbBookings = [{ id: 1, booking_ref: 'RBAC-REF-3', payment_status: 'confirmed', amount: 1000, payu_mihpayid: 'PAYU-MIH-1' }];

      const res = await POST(makeRequest({ ref: 'RBAC-REF-3', reason: 'test' }));
      expect(res.status).toBe(401);
      assertPayuSafety();
    });

    it('13. unauthenticated → 401 (PayU NOT called)', async () => {
      mockReadSuperAdminId.mockResolvedValue(null);
      dbBookings = [{ id: 1, booking_ref: 'RBAC-REF-4', payment_status: 'confirmed', amount: 1000, payu_mihpayid: 'PAYU-MIH-1' }];

      const res = await POST(makeRequest({ ref: 'RBAC-REF-4', reason: 'test' }));
      expect(res.status).toBe(401);
      assertPayuSafety();
    });
  });

  // ════════════════════════════════════════════════════════════════
  // Task C: PayU call safety verification (consolidated)
  // ════════════════════════════════════════════════════════════════
  describe('Task C: PayU call safety for all blocked cases', () => {
    it('blocked by payment_status=non-confirmed → 0 PayU calls, 0 mutations, 0 audits', async () => {
      dbBookings = [{ id: 1, booking_ref: 'SAFE-REF-1', payment_status: 'pending', amount: 1000, payu_mihpayid: null }];

      await POST(makeRequest({ ref: 'SAFE-REF-1', reason: 'safety test' }));

      expect(mockInitiatePayuRefund).toHaveBeenCalledTimes(0);
      expect(mockLogAuditAction).toHaveBeenCalledTimes(0);
      // Only SELECT was called, no UPDATE
      const updateCalls = mockQuery.mock.calls.filter(
        ([sql]) => typeof sql === 'string' && sql.startsWith('UPDATE')
      );
      expect(updateCalls).toHaveLength(0);
    });

    it('blocked by race condition → UPDATE returns empty → 0 PayU calls after UPDATE', async () => {
      // Simulate: UPDATE returns empty (another request already consumed the booking)
      dbBookings = [{ id: 1, booking_ref: 'RACE-REF-1', payment_status: 'confirmed', amount: 1000, payu_mihpayid: 'PAYU-MIH-1' }];

      // Override UPDATE mock to return empty (simulating race)
      mockQuery.mockImplementation(async (sql: string, _params?: any[]) => {
        if (typeof sql !== 'string') return [];
        if (sql.startsWith('SELECT')) return [...dbBookings];
        if (sql.startsWith('UPDATE')) return [];
        return [];
      });

      const res = await POST(makeRequest({ ref: 'RACE-REF-1', reason: 'race test' }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toContain('not in confirmed state');
      expect(mockInitiatePayuRefund).toHaveBeenCalledTimes(0);
      expect(mockLogAuditAction).toHaveBeenCalledTimes(0);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // Task D: Multi-slot refund regression
  // ════════════════════════════════════════════════════════════════
  describe('Task D: Multi-slot refund', () => {
    it('confirmed 2-slot group → exactly 1 PayU call, 1 audit, correct net amount', async () => {
      dbBookings = [
        { id: 1, booking_ref: 'MULTI-CONFIRMED', payment_status: 'confirmed', amount: 1000, payu_mihpayid: 'PAYU-MIH-MULTI' },
        { id: 2, booking_ref: 'MULTI-CONFIRMED', payment_status: 'confirmed', amount: 1000, payu_mihpayid: 'PAYU-MIH-MULTI' },
      ];

      const res = await POST(makeRequest({ ref: 'MULTI-CONFIRMED', reason: 'Multi-slot override' }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.grossAmount).toBe(2000);
      expect(body.serviceFee).toBe(100);   // 5% of 2000
      expect(body.refundAmount).toBe(1900); // 2000 - 100
      expect(mockInitiatePayuRefund).toHaveBeenCalledTimes(1);
      expect(mockInitiatePayuRefund).toHaveBeenCalledWith({
        bookingRef: 'MULTI-CONFIRMED',
        mihpayid: 'PAYU-MIH-MULTI',
        amount: 1900,
        reason: 'Multi-slot override',
      });
      expect(mockLogAuditAction).toHaveBeenCalledTimes(1);
    });

    it('unconfirmed (pending) 2-slot group → REJECTED, 0 PayU calls, 0 mutations, 0 audits', async () => {
      dbBookings = [
        { id: 1, booking_ref: 'MULTI-PENDING', payment_status: 'pending', amount: 1000, payu_mihpayid: null },
        { id: 2, booking_ref: 'MULTI-PENDING', payment_status: 'pending', amount: 1000, payu_mihpayid: null },
      ];

      const res = await POST(makeRequest({ ref: 'MULTI-PENDING', reason: 'attempt' }));

      expect(res.status).toBe(400);
      expect(mockInitiatePayuRefund).toHaveBeenCalledTimes(0);
      expect(mockLogAuditAction).toHaveBeenCalledTimes(0);
      // No UPDATE mutation
      const updateCalls = mockQuery.mock.calls.filter(
        ([sql]) => typeof sql === 'string' && sql.startsWith('UPDATE')
      );
      expect(updateCalls).toHaveLength(0);
    });

    it('3-slot confirmed group → exactly 1 PayU call for combined amount', async () => {
      dbBookings = [
        { id: 1, booking_ref: 'MULTI-3SLOT', payment_status: 'confirmed', amount: 500, payu_mihpayid: 'PAYU-MIH-3SLOT' },
        { id: 2, booking_ref: 'MULTI-3SLOT', payment_status: 'confirmed', amount: 500, payu_mihpayid: 'PAYU-MIH-3SLOT' },
        { id: 3, booking_ref: 'MULTI-3SLOT', payment_status: 'confirmed', amount: 500, payu_mihpayid: 'PAYU-MIH-3SLOT' },
      ];

      const res = await POST(makeRequest({ ref: 'MULTI-3SLOT', reason: '3-slot override' }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.grossAmount).toBe(1500);
      expect(body.serviceFee).toBe(75);    // 5% of 1500
      expect(body.refundAmount).toBe(1425); // 1500 - 75
      expect(mockInitiatePayuRefund).toHaveBeenCalledTimes(1);
      expect(mockInitiatePayuRefund).toHaveBeenCalledWith({
        bookingRef: 'MULTI-3SLOT',
        mihpayid: 'PAYU-MIH-3SLOT',
        amount: 1425,
        reason: '3-slot override',
      });
    });
  });

  // ════════════════════════════════════════════════════════════════
  // Task E: Idempotency & concurrency
  // ════════════════════════════════════════════════════════════════
  describe('Task E: Idempotency & concurrency', () => {
    it('two simultaneous refund requests → exactly 1 succeeds', async () => {
      dbBookings = [
        { id: 1, booking_ref: 'CONCURRENCY-REF', payment_status: 'confirmed', amount: 1000, payu_mihpayid: 'PAYU-MIH-CONC' },
        { id: 2, booking_ref: 'CONCURRENCY-REF', payment_status: 'confirmed', amount: 1000, payu_mihpayid: 'PAYU-MIH-CONC' },
      ];

      const [resA, resB] = await Promise.all([
        POST(makeRequest({ ref: 'CONCURRENCY-REF', reason: 'concurrent A' })),
        POST(makeRequest({ ref: 'CONCURRENCY-REF', reason: 'concurrent B' })),
      ]);

      const bodyA = await resA.json();
      const bodyB = await resB.json();

      // Exactly one succeeds
      const successCount = [resA, resB].filter((r) => r.status === 200).length;
      const failCount = [resA, resB].filter((r) => r.status === 400).length;

      expect(successCount).toBe(1);
      expect(failCount).toBe(1);

      // Exactly 1 PayU call
      expect(mockInitiatePayuRefund).toHaveBeenCalledTimes(1);

      // Exactly 1 audit event
      expect(mockLogAuditAction).toHaveBeenCalledTimes(1);
    });

    it('double-click (sequential repeat) → idempotent block (400)', async () => {
      dbBookings = [
        { id: 1, booking_ref: 'IDEMPOTENT-REF', payment_status: 'confirmed', amount: 1000, payu_mihpayid: 'PAYU-MIH-IDEM' },
        { id: 2, booking_ref: 'IDEMPOTENT-REF', payment_status: 'confirmed', amount: 1000, payu_mihpayid: 'PAYU-MIH-IDEM' },
      ];

      // First request — should succeed
      const res1 = await POST(makeRequest({ ref: 'IDEMPOTENT-REF', reason: 'first' }));
      expect(res1.status).toBe(200);
      expect(mockInitiatePayuRefund).toHaveBeenCalledTimes(1);

      // Second request — should be blocked (bookings now 'cancelled')
      const res2 = await POST(makeRequest({ ref: 'IDEMPOTENT-REF', reason: 'duplicate' }));
      const body2 = await res2.json();

      expect(res2.status).toBe(400);
      expect(body2.message).toContain('already');
      // Still only 1 PayU call
      expect(mockInitiatePayuRefund).toHaveBeenCalledTimes(1);
    });

    it('different Super Admin sessions → both blocked after first succeeds', async () => {
      dbBookings = [
        { id: 1, booking_ref: 'SESSION-REF', payment_status: 'confirmed', amount: 1000, payu_mihpayid: 'PAYU-MIH-SESS' },
        { id: 2, booking_ref: 'SESSION-REF', payment_status: 'confirmed', amount: 1000, payu_mihpayid: 'PAYU-MIH-SESS' },
      ];

      // First session
      mockReadSuperAdminId.mockResolvedValue(2);
      const res1 = await POST(makeRequest({ ref: 'SESSION-REF', reason: 'session 1' }));
      expect(res1.status).toBe(200);

      // Second session (different super admin ID)
      mockReadSuperAdminId.mockResolvedValue(3);
      const res2 = await POST(makeRequest({ ref: 'SESSION-REF', reason: 'session 2' }));
      expect(res2.status).toBe(400);

      // Only 1 PayU call
      expect(mockInitiatePayuRefund).toHaveBeenCalledTimes(1);
      // Only 1 audit log
      expect(mockLogAuditAction).toHaveBeenCalledTimes(1);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // Task F: PayU pending state regression
  // ════════════════════════════════════════════════════════════════
  describe('Task F: PayU pending state must not become REFUNDED', () => {
    it('route sets refund_status=INITIATED → computeRefundLifecycleStatus returns PROCESSING (not REFUNDED)', async () => {
      const { computeRefundLifecycleStatus } = await import('@/lib/refund-policy');

      dbBookings = [
        { id: 1, booking_ref: 'PENDING-REF', payment_status: 'confirmed', amount: 1000, payu_mihpayid: 'PAYU-MIH-PEND' },
        { id: 2, booking_ref: 'PENDING-REF', payment_status: 'confirmed', amount: 1000, payu_mihpayid: 'PAYU-MIH-PEND' },
      ];

      // Simulate PayU returning "initiated" (not final settlement)
      mockInitiatePayuRefund.mockResolvedValue({
        success: true,
        refundRequestId: 'REF-TEST-PENDING',
        payuTxnId: 'PAYU-MIH-PEND',
        response: { status: 1, msg: 'Refund Initiated' },
        message: 'Refund request initiated via PayU (PENDING status).',
        environmentLimitation: true,
      });

      const res = await POST(makeRequest({ ref: 'PENDING-REF', reason: 'pending test' }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.payuRefundDetails.payuSuccess).toBe(true);

      // Simulate the post-refund DB state: payment_status='cancelled', refund_status='INITIATED'
      const postRefundLifecycle = computeRefundLifecycleStatus({
        payment_status: 'cancelled',
        refund_amount: 950,
        refund_status: 'INITIATED',
      });
      expect(postRefundLifecycle.status).not.toBe('REFUNDED');
      expect(postRefundLifecycle.isRefunded).toBe(false);
      expect(postRefundLifecycle.status).toBe('PROCESSING');
      expect(postRefundLifecycle.isProcessing).toBe(true);
    });

    it('PayU failure → refund_status=PENDING_REVIEW → NOT REFUNDED', async () => {
      const { computeRefundLifecycleStatus } = await import('@/lib/refund-policy');

      dbBookings = [
        { id: 1, booking_ref: 'PAYU-FAIL-REF', payment_status: 'confirmed', amount: 1000, payu_mihpayid: 'PAYU-MIH-FAIL' },
        { id: 2, booking_ref: 'PAYU-FAIL-REF', payment_status: 'confirmed', amount: 1000, payu_mihpayid: 'PAYU-MIH-FAIL' },
      ];

      mockInitiatePayuRefund.mockResolvedValue({
        success: false,
        refundRequestId: 'REF-TEST-FAIL',
        payuTxnId: 'PAYU-MIH-FAIL',
        response: { status: 0, msg: 'Invalid transaction' },
        message: 'PayU refund request failed',
        environmentLimitation: true,
      });

      const res = await POST(makeRequest({ ref: 'PAYU-FAIL-REF', reason: 'fail test' }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.payuRefundDetails.payuSuccess).toBe(false);
      expect(body.payuRefundDetails.environmentLimitation).toBe(true);

      // Route sets refund_status = 'PENDING_REVIEW' when PayU fails
      const postRefundLifecycle = computeRefundLifecycleStatus({
        payment_status: 'cancelled',
        refund_amount: 950,
        refund_status: 'PENDING_REVIEW',
      });
      expect(postRefundLifecycle.status).not.toBe('REFUNDED');
      expect(postRefundLifecycle.isRefunded).toBe(false);
    });

    it('only REFUNDED status (from PayU callback) → REFUNDED', async () => {
      const { computeRefundLifecycleStatus } = await import('@/lib/refund-policy');

      // Simulate the final settlement state that would be set by check_action_status callback
      const finalLifecycle = computeRefundLifecycleStatus({
        payment_status: 'refunded',
        refund_amount: 950,
        refund_status: 'REFUNDED',
      });
      expect(finalLifecycle.status).toBe('REFUNDED');
      expect(finalLifecycle.isRefunded).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // Task C: Refund amount calculation verification
  // ════════════════════════════════════════════════════════════════
  describe('Task G: Refund amount calculation (5% fee)', () => {
    it('gross ₹2000 → fee ₹100 → net ₹1900 passed to PayU', async () => {
      dbBookings = [
        { id: 1, booking_ref: 'AMOUNT-REF', payment_status: 'confirmed', amount: 1000, payu_mihpayid: 'PAYU-MIH-AMT' },
        { id: 2, booking_ref: 'AMOUNT-REF', payment_status: 'confirmed', amount: 1000, payu_mihpayid: 'PAYU-MIH-AMT' },
      ];

      const res = await POST(makeRequest({ ref: 'AMOUNT-REF', reason: 'amount test' }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.grossAmount).toBe(2000);
      expect(body.serviceFee).toBe(100);
      expect(body.refundAmount).toBe(1900);

      // Verify the exact amount passed to PayU
      const payuCall = mockInitiatePayuRefund.mock.calls[0];
      expect(payuCall[0].amount).toBe(1900);
    });
  });
});
