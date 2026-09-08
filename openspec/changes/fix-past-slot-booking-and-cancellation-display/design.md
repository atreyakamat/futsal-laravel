## Context

See proposal.md - Why. Two unrelated root causes bundled into one change because both were reported together and both are small, targeted fixes.

**Past-slot booking:** `lib/refund-policy.ts` already exports `getBookingTimeRange(bookingDateStr, timeSlots)`, which parses a booking date + slot array into authoritative IST `Date` objects (`+05:30` literal offset, not server-local time) and is already used for cancellation-eligibility math. It takes an array of slots and returns one combined range, but calling it with a single-element array (`[slot.time_slot]`) gives exactly that one slot's own `bookingStart` — no new date-math needs writing.

`lib/domain.ts`'s `createBookingBatch()` already has a precedent for this exact kind of defensive server-side date guard: it independently re-checks `maxBookableDate` (the upper bound) even though `/api/slots/status` already hides dates beyond it, specifically because "a request could still be crafted directly against this path" (its own comment, line ~420). The past-slot check (the lower bound) belongs in the same place, for the same reason.

**Cancellation display:** `app/api/bookings/cancel/route.ts` already computes the exact right reason via `noRefundReason`-equivalent branching (lines 142-152: distinguishes pay-at-venue / arena-opt-out / month-expired / late-cutoff) for the one-time JSON response message — it's only the *persisted* state that collapses all four into a single `refund_status = 'NOT_APPLICABLE'` with no distinguishing detail. `computeRefundLifecycleStatus()` in `lib/refund-policy.ts` is the single read-side function that turns persisted state into a customer message, called from both `app/dashboard/page.tsx` (indirectly, via `CancelBookingBtn`) and `CancelBookingBtn.tsx` itself.

## Goals / Non-Goals

**Goals:**
- Make an already-started slot genuinely unbookable, not just unlikely to be clicked in normal UI flow.
- Preserve enough detail at cancellation time that the later-displayed reason is accurate.
- Stop presenting a cancelled booking as a failed payment.

**Non-Goals:**
- Not changing the *cancellation cutoff* rules themselves (`evaluateCancellationEligibility` in `lib/refund-policy.ts`) — only how the outcome is later displayed.
- Not adding a new database column for the no-refund sub-reason — `bookings.cancellation_reason` is already a free-text column used for exactly this kind of note (e.g. the existing `'REJECTED: ...'` prefix convention `computeRefundLifecycleStatus` already parses), so a second convention (`'NO_REFUND: ...'`-style prefix) reuses it rather than migrating schema.
- Not touching `admin_created`/staff-cancelled bookings (`app/api/fg-admin/platform/bookings/cancel/route.ts`) — the customer's report and this fix are scoped to customer self-cancellation; the staff route can be revisited separately if it has the same gap.
- Not changing what counts as "past" for *cancellation eligibility* (`PAST_BOOKING`, keyed off `bookingEnd`) — that's a different, already-correct check for a different action (cancelling vs. booking).

## Decisions

**Past-slot cutoff is the slot's `bookingStart`, not `bookingEnd`.** You can't retroactively secure a time window that has already begun, even if it's still "in progress" — booking implies the turf becomes yours starting now, and a slot whose start has already passed can't do that. This differs from the existing `PAST_BOOKING` *cancellation* check, which correctly uses `bookingEnd` (you can still cancel — and get a same-day "no refund, too late" outcome — for a booking that's currently in progress; you just can't undo one that's already fully over).

**New `past` slot status, not silently reusing `blocked`.** Alternative considered: fold past slots into the existing `blocked` status to avoid touching the UI's status enum. Rejected — `blocked` is admin-controlled (`admin_slot_blocks` table) and its UI label is "Booked" alongside genuinely `booked` slots; showing "Booked" for a slot nobody booked (it just expired) would itself be a small new inaccuracy of the same shape as the bug being fixed. A distinct `past` status gets its own "Unavailable"-style label while sharing the same non-clickable, greyed-out visual treatment `booked`/`blocked` already have — no new visual language, just a new value in the existing switch.

**Enforcement lives in `lockSlots()` and `createBookingBatch()`, not only `/api/slots/status`.** The status endpoint only affects what's *shown*; a request straight to `/api/slots/lock` or `/api/bookings/process` bypasses it entirely, exactly the gap the maxBookableDate check already guards against on the upper bound. Both functions get the same `getBookingTimeRange`-based check, skip/reject the offending slot(s), and report failure the same way an already-booked slot does today (added to `lockSlots`'s `failed` array; a thrown `Error` from `createBookingBatch`, matching its existing `maxBookableDate` throw).

**No-refund reason persisted as a `cancellation_reason` prefix, read back by `computeRefundLifecycleStatus()`.** `cancellation_reason` already carries `'User Requested'` (customer-initiated, refund-eligible or under review) and a `'REJECTED: ...'` convention `computeRefundLifecycleStatus` parses today. Extending it with reason codes for the no-refund case — e.g. `'NO_REFUND: LATE_CUTOFF'`, `'NO_REFUND: MONTH_EXPIRED'`, `'NO_REFUND: ARENA_OPT_OUT'`, `'NO_REFUND: OFFLINE_UNCOLLECTED'` — lets `computeRefundLifecycleStatus()`'s `NOT_APPLICABLE` branch look up the matching customer-facing sentence (the same four sentences `app/api/bookings/cancel/route.ts` already writes into its one-time response message, just centralized so both the immediate response and the later persisted display agree) instead of the single hardcoded pay-at-venue sentence it returns today. An unrecognized/missing reason (e.g. old bookings cancelled before this change shipped) falls back to today's exact wording, so nothing already in the database regresses to a blank or broken message.

**`app/dashboard/page.tsx`'s status indicator gets an explicit `cancelled` branch**, inserted before the current catch-all `else` (which becomes the genuine "payment failed" case, matching `payment_status === 'failed'` specifically rather than "anything that isn't confirmed or pending").

## Risks / Trade-offs

- [A slot exactly at its start instant is a razor's edge — `now === bookingStart` rejects it] → Intentional: matches "already begun" rather than "about to begin"; a customer one second before start still succeeds, same as any real-world "starts at" boundary.
- [Existing bookings cancelled before this ships have `cancellation_reason = 'User Requested'` with no no-refund detail] → `computeRefundLifecycleStatus()`'s fallback keeps today's exact pay-at-venue wording for anything it can't parse a specific reason from, so old records don't regress to something worse than what they show now — only newly-cancelled bookings get the accurate reason.
- [Reusing a free-text column for structured reason codes is stringly-typed] → Consistent with the existing `'REJECTED: ...'` convention already in this same column; introducing a real enum/column is a larger schema change out of scope for this fix.
