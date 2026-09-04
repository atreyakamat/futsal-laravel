## Why

Six issues were found in the live app spanning checkout UX, staff RBAC, and tax-invoice capture: customer details are collected before login instead of after; already-verified contact fields stay editable at checkout; there's no way to capture a customer's GSTIN/company name for the tax invoice; reschedule is gated to the wrong role (a pre-existing code/comment mismatch — `/api/fg-admin/arena/reschedule`'s own header says "Arena Admin ONLY" but the code checks `role !== 'manager'`); staff-created bookings can't be self-cancelled by the customer even though they should be; and there's no admin-configurable limit on how far ahead bookings can be made.

## What Changes

- Move the Customer Details section (name/mobile/email) on the arena page's slot picker so it only renders after the visitor is logged in, not as soon as slots are selected.
- Add a persisted "login channel" (mobile vs email) captured at OTP verification. At checkout, lock whichever field matches the channel actually used to log in (email OTP → email locked; mobile/WhatsApp OTP → mobile locked); the other field stays editable.
- Add optional GST capture at checkout: "Do you have a GST number?" (if yes, GSTIN) and "Should the invoice show a company name?" (if yes, company name) — both optional, stored on the booking, and threaded into tax invoice generation as the buyer's GSTIN/company name.
- Fix `/api/fg-admin/arena/reschedule`'s role check from `manager` to `super_admin`/`arena_admin` (scoped via the existing `hasArenaAccess` pattern rather than a single fixed arena id), matching the route's own stated intent. Move the reschedule action from the manager-only `/fg-admin/arena/bookings` page to the super_admin/arena_admin `/fg-admin/platform/bookings` page; managers keep viewing their arena's bookings there but no longer see a reschedule action.
- **BREAKING** (reverses part of the `staff-created-bookings` change from last session): a customer CAN now self-cancel a staff-created (`admin_created`) booking, in addition to staff (manager/arena_admin/super_admin) being able to cancel it. Flagging explicitly since this is a direct reversal of a "customer cannot cancel staff-created bookings" requirement built earlier this session — see the delta on that capability below for exactly what changes and what stays.
- Add a super-admin-editable "booking window" setting (days ahead bookings are open for, e.g. today + next 15 days inclusive) enforced in both the slot-availability API and booking creation, replacing today's effectively-unbounded forward navigation.

## Capabilities

### Modified Capabilities
- `booking-and-payment`: customer-details-after-login timing; locking the verified contact field at checkout based on login channel; optional GST/company-name capture at checkout; a configurable forward booking window.
- `staff-created-bookings`: customers can now self-cancel a staff-created booking (previously blocked outright); staff cancellation is unchanged.
- `admin-rbac`: reschedule authority moves from `manager` to `super_admin`/`arena_admin`.

## Impact

- `components/BookingSystem.tsx` (customer-details timing), `components/CheckoutForm.tsx` and `app/booking/checkout/page.tsx` (locked field, GST fields), `lib/session.ts` (new login-channel signal, new OTP verify write path), `app/api/bookings/cancel/route.ts` and `components/CancelBookingBtn.tsx` (drop the admin_created block), `app/api/fg-admin/arena/reschedule/route.ts` (role fix + arena scoping), `app/fg-admin/arena/bookings/page.tsx` and `app/fg-admin/platform/bookings/page.tsx` (move the reschedule UI), `lib/gst-documents.ts`/`lib/gst-pdf.ts` (buyer GSTIN/company name on the invoice), `lib/domain.ts` (new `bookings` columns: `customer_gstin`, `customer_company_name`; new `settings` row for the booking window), the slot-availability API and `createBookingBatch`'s validation (enforce the window).
