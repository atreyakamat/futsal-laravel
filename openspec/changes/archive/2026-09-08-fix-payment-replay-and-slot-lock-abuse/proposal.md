## Why

A security review of the slot-booking and PayU payment flow found three issues:

1. **A cancelled (and possibly already-refunded) booking can be resurrected by replaying its own PayU success callback.** `app/api/payment/callback/route.ts`'s idempotency check only short-circuits for `payment_status` `confirmed` or `failed` — never `cancelled` — and `confirmPayment()` in `lib/domain.ts` unconditionally sets `payment_status = 'confirmed'` with no guard on the row's current state. The callback's authenticity comes only from a hash with no timestamp or nonce, and the customer's own browser receives the full callback payload via the `surl`/`furl` redirect, so it's trivially capturable and replayable at any later time. A customer can book & pay, self-cancel within the refund window, then replay their own original success callback to flip the booking back to `confirmed` — keeping both the refund and a live booking.
2. **`/api/slots/lock` has no abuse limit.** It requires no authentication, and `fg_session_id` is a client-supplied cookie with no server-side identity behind it — a script can mint a fresh session per request and hold a 10-minute lock on every slot for an arena indefinitely (re-locking as each expires), making it unbookable for real customers. Nothing in the codebase limits concurrent locks; rate limiting exists only on the OTP endpoints.
3. **`verifyPayuResponseHash()` compares the two SHA-512 digests with plain `===`** instead of a timing-safe comparison, on a function that gates whether a payment is trusted.

## What Changes

- `confirmPayment()` only updates a booking that is still `pending`; the callback route treats `cancelled` the same as `confirmed`/`failed` for idempotency (no reprocessing), and falls back to re-checking the booking's actual current status if the update was a no-op (handles a legitimate concurrent-callback race without misreporting failure).
- `lockSlots()` gains a cap on how many currently-active locks a single client IP may hold at once, independent of session id (which the caller controls and can rotate freely); `/api/slots/lock` passes the requester's IP through.
- `verifyPayuResponseHash()` uses `crypto.timingSafeEqual` for the final digest comparison instead of `===`.

## Capabilities

### Modified Capabilities
- `booking-and-payment`: a booking's payment can no longer be confirmed once it has been cancelled, and slot locking is capped per client IP to prevent one actor from holding all of an arena's availability.

## Impact

- `lib/domain.ts`: `confirmPayment()` gains a `WHERE payment_status = 'pending'` guard and returns `null` on a no-op instead of assuming success; `lockSlots()` gains a per-IP active-lock cap (new `slot_locks.client_ip` column via the existing `ensureSchemaColumns()` pattern — no formal migration).
- `app/api/payment/callback/route.ts`: treats `cancelled` as already-resolved (no reprocessing) and re-checks actual status when `confirmPayment()` no-ops.
- `app/api/slots/lock/route.ts`: passes the requester's IP (`x-forwarded-for`, same pattern already used for audit logging elsewhere) into `lockSlots()`.
- `lib/payment.ts`: `verifyPayuResponseHash()`'s final comparison becomes timing-safe. Pure hardening — same inputs produce the same true/false result, so this isn't a spec-level behavior change and has no requirement of its own.
- No schema migration beyond one new nullable column on `slot_locks`.
