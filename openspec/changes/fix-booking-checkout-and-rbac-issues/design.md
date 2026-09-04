## Context

Six independent fixes bundled into one change because they were reported together and are all small, but they touch different modules. See proposal.md for the "why" on each. Two concrete findings from investigation shape the approach below:

- `components/BookingSystem.tsx` is already handed an `isLoggedIn` prop by its only caller (`app/arena/[slug]/page.tsx:230`, `isLoggedIn={!!userId}`) but never reads it — the login-status signal already reaches the component, it's just unused.
- `/api/fg-admin/arena/reschedule/route.ts`'s own header comment says "Arena Admin ONLY" but its code checks `role !== 'manager'`. The fix isn't inventing new access control — it's making the code match what the route already claims to be.

## Goals / Non-Goals

**Goals:**
- Fix all six issues with the smallest change that actually closes each gap server-side (not just hiding a button client-side).
- Reuse existing patterns already established in this codebase (settings-table config, `ensureSchemaColumns()`, `hasArenaAccess()`) rather than inventing new ones.

**Non-Goals:**
- Not building a general "verified contact fields" system beyond the two fields (email, mobile) that already exist.
- Not adding GST validation (GSTIN checksum/format validation) beyond basic non-empty capture — pure capture-and-store, matching how the rest of checkout handles free-text fields today.
- Not changing who can create a staff booking (item 5 only affects who can *cancel* one).
- Not backfilling a booking-window value for arenas that don't set one — a sensible default (see Decisions) covers that instead of requiring every arena to configure it up front.

## Decisions

**1. Customer-details-after-login (item 1):** Use the already-passed `isLoggedIn` prop rather than adding a new one. When `false`, the slot-picker's Customer Details section is replaced with a "Log in to continue" prompt instead of the name/mobile/email fields, and `handleProceed` redirects to `/login?next=<current arena URL with slots preserved>` instead of pushing to `/booking/checkout` with guest-typed values. Once logged in and redirected back, the section renders normally (pre-filled from the account, as it already does for a logged-in visitor today).
  - *Alternative considered:* Keep collecting details pre-login and just re-verify at checkout (today's behavior). Rejected — this is exactly the reported bug, and it also means guest-typed values were never actually attached to a verified identity, which is what makes locking the verified field (item 2) meaningful in the first place.

**2. Locked verified field (item 2):** Add a new signed cookie, `fg_auth_channel` (values `mobile` | `email`), set alongside the existing auth cookies at OTP verification (`app/api/auth/verify-otp/route.ts` already computes `isMobileNum` there — just also persist it). A new `readAuthChannel()` in `lib/session.ts` reads it. `CheckoutForm` receives the channel as a prop and renders the matching input as `readOnly` (visually distinct, e.g. dimmed) rather than removing it, so the customer can still see the value that will be used.
  - *Alternative considered:* Store the channel on the `users` row instead of a cookie. Rejected — a cookie matches how this session already tracks role/arena (`readAuthRole`, `readArenaId`), is simpler to invalidate on logout, and a user's channel can legitimately differ between logins (they might have both an email and a mobile OTP option).

**3. GST capture (item 3):** Two new nullable `bookings` columns via `ensureSchemaColumns()`: `customer_gstin TEXT NULL`, `customer_company_name TEXT NULL`. Two yes/no toggles in `CheckoutForm` (and the staff `StaffBookingForm`, for consistency, though not explicitly requested — flagging this inclusion rather than silently doing it beyond scope: staff-created bookings also generate tax invoices, so leaving them out would be an inconsistent gap) each revealing a text input when "yes". `createBookingBatch` accepts and stores both; `lib/gst-documents.ts`/`lib/gst-pdf.ts` read them onto the invoice as the buyer's GSTIN/name, falling back to the customer's own name when no company name was given.
  - *Alternative considered:* A separate `booking_gst_details` table. Rejected — two nullable columns on `bookings` matches how every other booking-scoped field already lives directly on that table; a join table would be new architecture for two optional strings.

**4. Reschedule role fix (item 4):** Change `/api/fg-admin/arena/reschedule/route.ts`'s check from `role !== 'manager'` to `!['super_admin', 'arena_admin'].includes(role)`, and replace the hardcoded `context.arenaId` scoping with an explicit `arena_id` in the request body validated through `hasArenaAccess(context, arena_id)` — the same pattern `/api/fg-admin/platform/bookings` already uses, since super_admin/platform-wide arena_admin aren't pinned to one arena the way manager is. Move `RescheduleBookingBtn`'s usage from `app/fg-admin/arena/bookings/page.tsx` (manager-only, unchanged otherwise — managers keep viewing bookings there) to `app/fg-admin/platform/bookings/page.tsx` (already gated to `super_admin`/`arena_admin`/`manager`; wrap the button in the same `['super_admin','arena_admin'].includes(context.role)` check used elsewhere on that page for staff-only actions).
  - *Alternative considered:* Leave the route/page as-is and just add a second copy for super_admin/arena_admin. Rejected — the route's own comment already says it's meant to be arena-admin-only; fixing the check in place is more honest than leaving a wrong comment next to duplicated logic.

**5. Customer can self-cancel a staff-created booking (item 5):** Remove the `admin_created` early-return block from `app/api/bookings/cancel/route.ts` and the corresponding info-panel branch in `components/CancelBookingBtn.tsx`, so a staff-created booking falls through to the exact same eligibility/refund logic as any other booking. The staff-side cancel endpoint (`app/api/fg-admin/platform/bookings/cancel/route.ts`) and its UI are untouched — both paths now simply coexist. The "STAFF BOOKED" badge and staff CANCEL button on `/fg-admin/platform/bookings` also stay, since staff cancelling is still valid, just no longer exclusive.
  - *Note:* This directly reverses a requirement built in the immediately preceding session's change. Called out explicitly in proposal.md's "What Changes" as **BREAKING** for that reason, not silently overwritten.

**6. Configurable booking window (item 6):** A new `settings` row, key `booking_window_days` (integer, default `15` if unset — chosen to match the example the user gave, so arenas that never touch the new setting keep behaving the way today's *de facto* usage pattern already looks, without a hard behavior change on day one), read the same way `cancellation_cutoff_hours` already is (`app/booking/checkout/page.tsx`'s existing `SELECT value FROM settings WHERE key = ?` pattern). Enforced in two places: `/api/slots/status` returns no slots (or a "beyond booking window" indicator) for a requested date past the window, and `createBookingBatch` rejects a booking attempt for such a date server-side regardless of what the client sent. A new field on the existing super-admin settings screen (`SuperAdminDashboardClient.tsx`, which already edits `cancellation_cutoff_hours` and other numeric policy settings) lets it be changed.
  - *Alternative considered:* Per-arena window instead of platform-wide. Rejected — the request says "super admin can set", implying one platform-wide value, matching how `cancellation_cutoff_hours` is also platform-wide today; nothing in the request asked for per-arena granularity.

## Risks / Trade-offs

- [Locking a field based on login channel assumes the channel cookie is always set for every existing logged-in session] → New sessions get it going forward; an already-logged-in customer from before this change simply sees both fields editable until they log in again (`readAuthChannel()` returning null falls back to "nothing locked", not an error).
- [Reversing the staff-created-booking cancellation restriction so soon after building it] → Explicitly flagged as BREAKING in the proposal; if this turns out to be a misunderstanding rather than a deliberate policy change, it's a one-line revert of the MODIFIED delta, not a re-architecture.
- [Booking-window enforcement could reject bookings admins expect to still work if the default (15) doesn't match actual current usage] → Default matches the example the user gave; verify the actual configured value in production before assuming 15 is right, and change it via the new settings field if not.

## Migration Plan

- New columns/settings are all additive (`ADD COLUMN IF NOT EXISTS`, an optional `settings` row) — no backfill needed, no destructive migration.
- Deploy order doesn't matter between the six fixes; they don't depend on each other. Can be shipped as one deploy per tasks.md's grouping, or split further if preferred at apply time.
- Rollback: each fix is independently revertable (no cross-fix coupling), so a problem in one doesn't require rolling back the others.
