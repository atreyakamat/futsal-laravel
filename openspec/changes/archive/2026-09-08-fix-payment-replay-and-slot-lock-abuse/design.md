## Context

See proposal.md - Why for the three findings. All three live in code already read closely during the security review this change follows up on: `lib/payment.ts`, `app/api/payment/callback/route.ts`, `lib/domain.ts`'s `confirmPayment()`/`lockSlots()`, and `app/api/slots/lock/route.ts`.

Relevant existing behavior:
- `app/api/payment/callback/route.ts` already has an idempotency check (`currentStatus === 'confirmed'` / `'failed'`) that just needs `'cancelled'` added to it.
- `confirmPayment()` (`lib/domain.ts` ~line 597) is called from exactly one place (the callback route) — safe to tighten its WHERE clause without touching any other caller.
- `evaluateCancellationEligibility`/`app/api/bookings/cancel/route.ts` already require `payment_status = 'confirmed'` to cancel, so a booking can only ever reach `cancelled` after having been genuinely `confirmed` first — the replay scenario is real, not hypothetical.
- `slot_locks` already has `session_id` (client-supplied, no server identity behind it) and `expires_at` (each lock lasts 10 minutes, per `lockSlots()`'s `expiresAt`). Nothing tracks the requester's IP today.
- `app/api/fg-admin/super-admin/refund/route.ts` already extracts the client IP the same way this change needs (`req.headers.get('x-forwarded-for') || 'unknown'`), for audit logging — same pattern, different purpose here.
- `ensureSchemaColumns()` (`lib/domain.ts` ~line 12) is the established way to add a column without a formal Prisma migration, and is described as cheap/idempotent enough to call liberally; `lockSlots()` doesn't currently call it and needs to, to pick up the new column.

## Goals / Non-Goals

**Goals:**
- Make a cancelled booking's payment_status immune to being flipped back to `confirmed` by any replayed/delayed/duplicate callback.
- Meaningfully raise the cost of hoarding an arena's slot availability from "a single trivial script" to "coordinated multiple IPs," without restricting normal multi-slot bookings.
- Close the timing side-channel on the callback's hash check.

**Non-Goals:**
- Not building a general-purpose rate limiter or introducing new infrastructure (Redis, etc.) — the fix stays inside the existing Postgres-backed, `ensureSchemaColumns()`-style pattern already used throughout `lib/domain.ts`.
- Not attempting to fully defeat a distributed (many-IP) attacker — that's a materially larger problem (would need CAPTCHA/proof-of-work/WAF-level controls) and out of scope for this fix. Raising the bar from "one script, zero cost" to "needs many IPs" is the intended, proportionate improvement.
- Not changing `payment_audit_logs` or adding new logging — the existing audit trail already records every callback attempt including replays; only the *effect* of a replay on `payment_status` changes.
- Not touching `markPaymentFailed()` — replaying a failure callback against a `cancelled` booking just re-labels it `failed` (a cosmetic downgrade with no service/financial impact, unlike the `confirmed` resurrection), and is out of scope here.

## Decisions

**Guard `confirmPayment()` at the SQL layer (`WHERE payment_status = 'pending'`), not just at the route.** Alternative considered: only add the `cancelled` check to the route's existing if/else idempotency block. Rejected as insufficient on its own — the route-level check is a necessary UX improvement (redirects the customer somewhere sensible) but the actual safety guarantee belongs on the write itself, the same way `app/api/bookings/cancel/route.ts` already guards its own UPDATE with `AND payment_status = 'confirmed'` rather than trusting an earlier read. Belt and suspenders: the route check avoids an unnecessary `verifyPaymentWithPayu()` round-trip and gives a better redirect; the SQL guard is the actual invariant.

**`confirmPayment()` returns `null` on a no-op update, and the route re-checks actual status in that case** — distinguishes "this booking doesn't exist" (already handled earlier in the route) from "this update didn't apply because the booking moved on." A legitimate race between two near-simultaneous success deliveries (browser redirect + an async webhook, if one is ever configured) would otherwise have the loser's `confirmPayment()` call look like a failure; re-checking status lets it redirect to the success page instead of incorrectly telling a customer their successful payment failed.

**Redirect target for a `cancelled` booking hit by a callback: `/dashboard`, not the payment-failed page.** There's no dedicated "this booking was cancelled" outcome page, and `/booking/payment-failed/[ref]` would incorrectly imply the payment itself failed. The dashboard already shows the booking correctly as `CANCELLED` (see the prior fix-past-slot-booking-and-cancellation-display change), which is the accurate state.

**Per-IP concurrent-active-lock cap, not a request-rate limit.** A rate limit (e.g. N requests/minute) doesn't actually stop the reported abuse: hoarding an arena's ~72 visible slots and re-locking them every 10 minutes is a low, steady request rate that any customer-friendly per-minute threshold would also have to allow. What actually matters is how much inventory one client can hold *at once* — so the cap counts currently-active (`expires_at > NOW()`) `slot_locks` rows for the requester's IP, across all of that IP's self-chosen session ids (since session id is exactly the thing an attacker rotates to dodge a per-session limit). A cap of 30 concurrent locks is generous for any real customer (the largest realistic single booking is well under that) while meaningfully bounding how much of one or more arenas' availability a single IP can occupy.

**IP, not session id, is the counting key.** Session id is client-supplied and free to mint; IP at least requires distinct network paths to multiply, which is a real (if not insurmountable) cost — consistent with this being a "raise the bar" fix, not a complete defense (see Non-Goals).

**New `slot_locks.client_ip` column via `ensureSchemaColumns()`, nullable.** Matches the project's established schema-change convention. Nullable so existing rows (and any request where `x-forwarded-for` is absent, e.g. local dev without a reverse proxy) don't need a backfill; a `NULL` client_ip simply doesn't count toward any IP's cap (can't attribute it), which is an acceptable gap for local/edge cases and does not weaken the production path where Caddy always sets the header.

**Timing-safe hash comparison via `crypto.timingSafeEqual`, with an explicit length check first.** `timingSafeEqual` throws on mismatched-length buffers rather than returning `false`; comparing lengths first and short-circuiting to `false` is fine because the digest length itself isn't secret (SHA-512 hex is always 128 chars) — only whether the *content* matches needs to be timing-safe.

## Risks / Trade-offs

- [A shared IP (office/campus NAT, mobile carrier-grade NAT) could hit the 30-concurrent-lock cap from unrelated customers' combined activity] → 30 is well above what simultaneous unrelated bookings from one NAT would realistically produce at this arena's scale (single-digit arenas, hourly slots); revisit the constant if real usage data says otherwise.
- [IP-based limiting doesn't stop a genuinely distributed attacker] → Accepted per Non-Goals; this raises the cost of the specific trivial single-script abuse found in review, not a complete defense.
- [`x-forwarded-for` can itself be spoofed by a client if the reverse proxy doesn't overwrite it] → Out of scope to audit the Caddy config here; matches the existing trust level already placed in this header elsewhere in the codebase (the super-admin refund audit log).
