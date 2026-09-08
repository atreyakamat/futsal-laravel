## 1. Reject past slots server-side

- [x] 1.1 In `lib/domain.ts`'s `lockSlots()`, for each requested slot compute its start instant via `getBookingTimeRange(bookingDate, [slot]).bookingStart` (already imported) and push it to `failed` (skip locking it) when that start is at or before `Date.now()`; verify a direct `POST /api/slots/lock` for a slot on today's date whose start has passed returns it in `failed`, not `locked`.
- [x] 1.2 In `lib/domain.ts`'s `createBookingBatch()`, add the same per-slot check right alongside the existing `maxBookableDate` check (~line 423-426) and throw the same style of `Error` (e.g. `Cannot book a slot that has already started.`) if any requested slot's start has passed; verify a direct `POST /api/bookings/process` for an already-started slot is rejected even if the client never called `/api/slots/lock` first.
- [x] 1.3 Verify a same-day slot whose start time has NOT yet arrived still locks and books successfully (no false positive).

## 2. Show past slots as unavailable, not available

- [x] 2.1 In `app/api/slots/status/route.ts`, import `getBookingTimeRange` from `@/lib/refund-policy` and classify a slot as `'past'` (checked before `'available'`, after `booked`/`blocked`/`locked`/`selected` — a slot already booked or locked keeps that status even if also past, since those are more specific/actionable states) when its start instant is at or before now; verify the JSON response for today's date shows `status: "past"` for elapsed slots and `status: "available"` for ones still ahead.
- [x] 2.2 In `components/BookingSystem.tsx`, treat `slot.status === 'past'` as non-clickable in both the mobile list and desktop table views (extend the existing `isBookedOrBlocked`-style checks), with its own label ("Unavailable") distinct from "Booked" so a customer doesn't think someone else booked it; verify visually that today's already-started slots render greyed out and unclickable with the new label, while later-today and future slots are unaffected.

## 3. Persist and display the real no-refund reason

- [x] 3.1 In `app/api/bookings/cancel/route.ts`, replace the hardcoded `cancellation_reason = 'User Requested'` on the no-refund path with a reason code reflecting which branch produced `noRefundDue` — `NO_REFUND: OFFLINE_UNCOLLECTED`, `NO_REFUND: ARENA_OPT_OUT`, `NO_REFUND: MONTH_EXPIRED`, or `NO_REFUND: LATE_CUTOFF` (matching the four branches already in the response `message` logic at lines 142-152) — while leaving the refund-eligible path's `'User Requested'` unchanged.
- [x] 3.2 In `lib/refund-policy.ts`'s `computeRefundLifecycleStatus()`, update the `NOT_APPLICABLE` branch (~line 229) to parse a `NO_REFUND: ...` prefix from `booking.cancellation_reason`/`refund_reason` and return the matching specific `customerMessage` for each of the four codes, falling back to today's exact pay-at-venue wording when no recognized code is present (covers bookings cancelled before this change).
- [x] 3.3 Verify with unit tests covering all four reason codes plus the fallback case, asserting `customerMessage` differs appropriately and is never the pay-at-venue sentence for a `LATE_CUTOFF`/`MONTH_EXPIRED`/`ARENA_OPT_OUT` reason.

## 4. Stop showing a cancelled booking as a failed payment

- [x] 4.1 In `app/dashboard/page.tsx`, add an explicit branch for `firstBooking.payment_status === 'cancelled'` (both the small status pill ~line 145-155 and the larger CTA-area indicator ~line 173-194) showing "CANCELLED" styling, before the catch-all that currently treats anything not `confirmed`/`pending` as a failed payment; the catch-all becomes the genuine `failed` case only.
- [x] 4.2 Verify visually: a `cancelled` booking shows a "CANCELLED" indicator (not "PAYMENT FAILED"), and a genuinely `failed` booking still shows "PAYMENT FAILED" unchanged.

## 5. Regression check

- [x] 5.1 Run the existing test suite (`--pool=forks`) and confirm no existing slot-locking/booking/refund tests regress.
