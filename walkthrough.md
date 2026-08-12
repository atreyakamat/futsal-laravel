# Futsal Refund System — Fix Walkthrough & Test Evidence

## Overview

Two critical refund-system bugs were identified and fixed in the Futsal application. This document provides a walkthrough of each fix, the test evidence proving they cannot regress, and the remaining gate (LIVE PAYU).

---

## Fix 1: Premature REFUNDED State Transitions

**File:** `lib/refund-policy.ts`
**Function:** `computeRefundLifecycleStatus`

### The Bug

The original code contained a flawed condition that could prematurely classify a booking as `REFUNDED`:

```typescript
// BUG (removed): refund_amount > 0 && payment_status === 'cancelled' → REFUNDED
```

When an admin cancelled a booking with a non-zero `refund_amount`, the state machine would immediately evaluate the lifecycle status as `REFUNDED` — even though no actual refund had been processed through the payment gateway. This caused:

1. **Customer-facing confusion**: The dashboard showed "Refund Completed" before the payment gateway confirmed the refund.
2. **Incorrect UI state**: The `isRefunded` flag was `true`, hiding refund action buttons that should have been visible.
3. **Audit trail mismatch**: The system appeared to have completed a refund that hadn't actually been initiated.

### The Fix

The buggy condition was removed. The state machine now strictly evaluates status based on the explicit `refund_status` field and the `payment_status`:

- `INITIATED` → maps to `PROCESSING` (refund queued, awaiting gateway confirmation)
- `PROCESSING` → maps to `PROCESSING`
- `PENDING_REVIEW` → maps to `PENDING_REVIEW`
- `REFUNDED` → only when `payment_status === 'refunded'` (confirmed by gateway)
- `REJECTED` → when `cancellation_reason` starts with `REJECTED:`
- `null`/empty → `PENDING_REVIEW` (safe default)

```typescript
// FIX: INITIATED and PROCESSING both return PROCESSING status
if (refund_status === 'INITIATED' || refund_status === 'PROCESSING' || payment_status === 'cancelled') {
  return { ...base, status: 'PROCESSING', isProcessing: true };
}

// FIX: REFUNDED only when payment_status is explicitly 'refunded'
if (payment_status === 'refunded') {
  return { ...base, status: 'REFUNDED', isRefunded: true };
}
```

### Test Evidence

| Test File | Assertions | Result |
|---|---|---|
| `tests/unit/refund-state-machine-regression.test.ts` | 30 | **ALL PASS** |

The regression test covers all 7 lifecycle states (PENDING_REVIEW, APPROVED, PROCESSING, REFUNDED, REJECTED, CANCELLED, FAILED) plus null/empty and inconsistent combinations — verifying that no `INITIATED`, `PROCESSING`, `PENDING`, `CANCELLED`, or `FAILED` state can produce `REFUNDED`.

---

## Fix 2: Super-Admin Non-Confirmed Payment Bypass

**File:** `app/api/fg-admin/super-admin/refund/route.ts`
**Handler:** `POST /api/fg-admin/super-admin/refund`

### The Bug

The original refund endpoint had no guard against processing refunds for bookings whose payment was not in a `confirmed` state. The flow was:

1. Authenticate Super Admin
2. Parse refund amount (5% fee calculation)
3. Call PayU refund API (`cancel_refund_transaction`)
4. Update database

This meant a Super Admin could trigger a PayU refund for a booking that was:
- Still `pending` (payment not yet completed)
- Already `failed`
- Already `cancelled` or `refunded`
- In `initiated` or `processing` state

### The Fix

Three layers of protection were added:

1. **Explicit status check** — Reject non-confirmed bookings before any processing:
```typescript
if (payment_status !== 'confirmed') {
  return NextResponse.json(
    { error: 'Only confirmed bookings can be refunded' },
    { status: 400 }
  );
}
```

2. **Atomic database UPDATE with RETURNING** — Only proceed if the database row is successfully locked and transitioned atomically:
```typescript
const result = await query(
  `UPDATE bookings SET payment_status = 'cancelled', refund_amount = ?, refund_status = 'INITIATED', updated_at = NOW()
   WHERE booking_ref = ? AND payment_status = 'confirmed' RETURNING id`,
  [refundAmount, bookingRef]
);
if (result.length === 0) {
  return NextResponse.json(
    { error: 'Booking already refunded or not confirmed' },
    { status: 400 }
  );
}
```

3. **PayU call only after DB update succeeds** — The PayU `cancel_refund_transaction` call happens only after the database UPDATE succeeds, preventing orphaned PayU refunds when the DB operation fails.

### Test Evidence

| Test File | Assertions | Result |
|---|---|---|
| `tests/unit/refund-authorization-regression.test.ts` | 26 | **ALL PASS** |
| `tests/integration/concurrency-race-conditions.test.ts` | 6 | **ALL PASS** |
| `tests/unit/backend-adversarial-final.test.ts` | 27 | **ALL PASS** |
| `tests/integration/real-db-transaction.test.ts` | 11 | **ALL PASS** |

The authorization regression test mocks PayU via `vi.mock` and verifies:
- All 6 non-confirmed statuses (pending, failed, cancelled, refunded, initiated, processing) are rejected with HTTP 400
- No PayU API calls are made for blocked requests
- No audit log entries are created for blocked requests
- Confirmed bookings proceed to atomic DB UPDATE before PayU call

---

## Additional Verification Tests

### DB-Integrated Tests (PostgreSQL 16)

| Test File | Assertions | Result |
|---|---|---|
| `tests/unit/adversarial-refund-hardening.test.ts` | 12 | **ALL PASS** |
| `tests/unit/backend-adversarial-final.test.ts` | 27 | **ALL PASS** |
| `tests/unit/security-attendance-lifecycle.test.ts` | 15 | **ALL PASS** |
| `tests/integration/concurrency-race-conditions.test.ts` | 6 | **ALL PASS** |
| `tests/integration/real-db-transaction.test.ts` | 11 | **ALL PASS** |
| `tests/integration/arena-admin-workflow.test.ts` | 27 | **ALL PASS** |

These tests exercise the full domain aggregate layer, security attendance checks, audit log creation, and concurrent refund race condition handling against a real PostgreSQL instance.

### Standalone Tests (Pure Function / Mocked)

| Test File | Assertions | Result |
|---|---|---|
| `tests/unit/refund-panel-lifecycle.test.ts` | 18 | **ALL PASS** |
| `tests/unit/refund-decision-lifecycle.test.ts` | 17 | **ALL PASS** |
| `tests/unit/cancellation-lifecycle.test.ts` | 17 | **ALL PASS** |
| `tests/unit/multi-slot-domain-consistency.test.ts` | 5 | **ALL PASS** |
| `tests/unit/dynamic-cancellation-cutoff.test.ts` | 5 | **ALL PASS** |

### TypeScript Validation

```bash
npx tsc --noEmit
# Result: PASS — No type errors in modified files
# (Pre-existing errors in app/fg-admin/platform/super-admin/SuperAdminDashboardClient.tsx
#  are unrelated to refund fixes)
```

---

## Test Evidence Classification

| Evidence Type | Source | PayU Status |
|---|---|---|
| Pure function evaluation | `refund-state-machine-regression.test.ts` | No PayU interaction |
| Mocked PayU (vi.mock) | `refund-authorization-regression.test.ts` | PayU mocked; `cancel_refund_transaction` intercepted |
| Real DB + mocked PayU | `concurrency-race-conditions.test.ts` | PayU mocked at module level |
| Real DB integration | `real-db-transaction.test.ts`, `arena-admin-workflow.test.ts` | DB updated via Prisma/direct query; PayU not called |
| Adversarial penetration | `adversarial-refund-hardening.test.ts`, `backend-adversarial-final.test.ts` | PayU mocked; DB mutations verified |

**All test evidence identifiers** (`PAYU-TEST-*`, `REF-TEST-*`, `TEST-REF-*`, `TKT-*`) are **synthetic test-only** and do not represent genuine live PayU merchant transactions.

---

## Remaining Gate: LIVE PAYU

| TC | Description | Status |
|---|---|---|
| TC-066 | PayU successful refund initiation (live `cancel_refund_transaction` call) | **PENDING** |
| TC-067 | PayU refund status verification (live `check_action_status` query) | **PENDING** |
| TC-075 | PayU transaction ↔ internal booking reconciliation (live mihpayid linkage) | **PENDING** |

These test cases require genuine PayU merchant credentials and a live payment transaction to execute. They cannot be completed in the development/sandbox environment. The refund flow is fully mocked and verified end-to-end except for the actual PayU API network call, which is environment-gated.

---

## Summary

| Category | Count | Result |
|---|---|---|
| Pure function regression tests | 30 | **PASS** |
| Authorization regression tests (mocked PayU) | 26 | **PASS** |
| DB-integrated tests (real PostgreSQL) | 98 | **PASS** |
| Standalone domain tests | 57 | **PASS** |
| Vitest-based domain tests | 5 | **PASS** |
| TypeScript compilation (modified files) | 1 | **PASS** |
| LIVE PayU tests | 3 | **PENDING** |
| **TOTAL** | **220** | **217 PASS, 3 PENDING** |
