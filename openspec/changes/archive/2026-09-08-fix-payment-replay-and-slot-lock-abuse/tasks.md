## 1. Stop a cancelled booking from being re-confirmed

- [x] 1.1 In `lib/domain.ts`'s `confirmPayment()`, add `AND payment_status = 'pending'` to the UPDATE's WHERE clause, and return `null` (instead of `bookings[0]`) when the update affects zero rows.
- [x] 1.2 In `app/api/payment/callback/route.ts`, add a `currentStatus === 'cancelled'` branch alongside the existing `confirmed`/`failed` idempotency checks, redirecting to `/dashboard` without reprocessing.
- [x] 1.3 In the same route, after calling `confirmPayment()`, if it returns `null` re-fetch the booking's current `payment_status` and redirect to the success page if it's now `confirmed` (a legitimate concurrent-callback race), otherwise to the payment-failed page — instead of unconditionally treating a `null` return as failure.
- [x] 1.4 Verify with a test: a `cancelled` booking's payment_status is unchanged after `confirmPayment()` is called against it directly, and after POSTing a validly-hash-signed success callback for it to the route.
- [x] 1.5 Verify a normal `pending` → success callback still confirms the booking as before (no regression).

## 2. Cap concurrent slot locks per client IP

- [x] 2.1 In `lib/domain.ts`'s `ensureSchemaColumns()`, add `ALTER TABLE slot_locks ADD COLUMN IF NOT EXISTS client_ip TEXT NULL`.
- [x] 2.2 In `lib/domain.ts`, export `MAX_ACTIVE_LOCKS_PER_IP = 30` and update `lockSlots()`'s signature to accept an optional `clientIp: string | null` parameter; call `ensureSchemaColumns()` at the top (it doesn't today) and store `client_ip` on each inserted/updated `slot_locks` row.
- [x] 2.3 In `lockSlots()`, when `clientIp` is provided, before the per-slot loop count that IP's currently-active locks (`expires_at > NOW()`) across all sessions; track remaining budget as the loop grants new locks (renewing an existing lock for the same session doesn't consume budget — only a brand-new lock does) and push any slot beyond the cap to `failed` instead of locking it.
- [x] 2.4 In `app/api/slots/lock/route.ts`, extract the requester's IP the same way `app/api/fg-admin/super-admin/refund/route.ts` does (`request.headers.get('x-forwarded-for') || 'unknown'`) and pass it to `lockSlots()`.
- [x] 2.5 Verify with a test: an IP already holding `MAX_ACTIVE_LOCKS_PER_IP` active locks (inserted directly for test setup, spread across several different session ids) has a new lock request for one more slot fail, while a request from a *different* IP for that same slot still succeeds.
- [x] 2.6 Verify a normal customer session locking a handful of slots (well under the cap) is unaffected, including re-locking (renewing) slots it already holds.

## 3. Timing-safe PayU hash comparison

- [x] 3.1 In `lib/payment.ts`'s `verifyPayuResponseHash()`, replace the `expectedHash === params.hash.toLowerCase()` comparison with a length check followed by `crypto.timingSafeEqual` on UTF-8 buffers of both digests.
- [x] 3.2 Verify with tests: a correct hash still returns `true`, an incorrect hash of the same length returns `false`, and a hash of a different length returns `false` without throwing.

## 4. Regression check

- [x] 4.1 Run the existing test suite (`--pool=forks`) and confirm no existing payment/callback/slot-locking tests regress.
