## Why

Two customer-reported bugs, both about the system showing/allowing something that no longer matches reality:

1. **Past slots are bookable.** At 11:15 PM a customer was able to select and book a 7:00 AM slot for the current day — a time window that had already ended over 16 hours earlier. `/api/slots/status`, `lockSlots()`, and `createBookingBatch()` in `lib/domain.ts` classify a slot purely by booked/locked/admin-blocked state; nothing checks whether the slot's own start time has already passed. This isn't just a display gap — `lockSlots()` and `createBookingBatch()` are the actual server-side gates, and neither rejects a past slot, so this is bookable end-to-end, not merely visible-but-blocked in the UI.
2. **A cancelled, no-refund booking displays as a failed payment, and always claims to be a pay-at-venue booking.** A customer's confirmed, online-paid booking was cancelled within the 24-hour no-refund cutoff. On the dashboard it now shows a "PAYMENT FAILED" indicator (`app/dashboard/page.tsx` treats every `payment_status` other than `confirmed`/`pending` as failed, which also catches `cancelled`), and its "Cancellation Status" panel says "This was a pay-at-venue booking with no payment collected, so no refund applies" — which is false; it was an online payment, cancelled too close to play. `computeRefundLifecycleStatus()` in `lib/refund-policy.ts` hardcodes that exact message for every `refund_status = 'NOT_APPLICABLE'` booking regardless of *why* no refund was due, even though `app/api/bookings/cancel/route.ts` already computes and returns the correct reason at cancellation time — it just never persists it, so the accurate reason is lost.

## What Changes

- **BREAKING (server-enforced, not just UI):** A time slot on a bookable date is no longer lockable or bookable once its own start time has passed — enforced in `lockSlots()` and `createBookingBatch()` (`lib/domain.ts`), not only hidden client-side. A direct API request for an already-started slot is rejected the same way an out-of-window date already is.
- `/api/slots/status` classifies a slot whose start time has passed as a new `past` status, shown in the UI as unavailable (distinct label from "Booked", since nobody booked it — it simply expired) and non-clickable, the same as booked/blocked/locked slots are today.
- `app/api/bookings/cancel/route.ts` persists the *specific* reason a cancellation carries no refund (late cutoff, invoice month expired, arena opted out of refunds, or genuinely a pay-at-venue booking where nothing was collected) instead of just the generic 'User Requested' reason it stores today.
- `computeRefundLifecycleStatus()` uses that persisted reason to show the correct customer-facing message for a `NOT_APPLICABLE` refund status, instead of always claiming it was an uncollected pay-at-venue booking.
- The customer dashboard's booking-status indicator (`app/dashboard/page.tsx`) shows "CANCELLED" for a `cancelled` booking instead of falling into the same "PAYMENT FAILED" branch as a genuinely failed payment.

## Capabilities

### Modified Capabilities
- `booking-and-payment`: slot availability classification now includes an already-past slot as a distinct, non-bookable state, and this is enforced server-side at both the slot-lock and booking-creation steps, not just reflected in the status endpoint.
- `refunds-and-cancellations`: the reason a cancelled booking carries no refund is preserved and accurately displayed afterward, and a cancelled booking is never presented as a failed payment.

## Impact

- `lib/domain.ts`: `lockSlots()`, `createBookingBatch()` gain a past-slot rejection check; `/api/slots/status`'s slot classification gains a `past` status.
- `components/BookingSystem.tsx`: renders the new `past` status as unavailable with its own label.
- `app/api/bookings/cancel/route.ts`: persists the specific no-refund reason instead of a generic one.
- `lib/refund-policy.ts`: `computeRefundLifecycleStatus()`'s `NOT_APPLICABLE` branch reads the persisted reason to pick the correct customer message.
- `app/dashboard/page.tsx`: booking-status indicator distinguishes `cancelled` from `failed`.
- No schema migration: the no-refund reason reuses the existing `cancellation_reason` text column.
