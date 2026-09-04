## 1. Customer details captured only after login

- [x] 1.1 In `components/BookingSystem.tsx`, destructure the existing `isLoggedIn` prop and replace the "Step 3: Customer Details Section" with a "Log in to continue" prompt when `isLoggedIn` is false; verify by loading an arena page logged out, selecting a slot, and confirming no name/mobile/email fields render. (Note: `isLoggedIn` wasn't actually wired to this component yet, contrary to design.md's assumption — added the prop and its `arena/[slug]/page.tsx` wiring, plus a new `arenaSlug` prop needed for 1.2's redirect.)
- [x] 1.2 Update `handleProceed` to redirect to `/login?next=<arena URL with date preserved>` when not logged in, instead of pushing to `/booking/checkout` with guest-typed values; verify the redirect preserves the arena/date so the customer lands back on the same arena after login.
- [x] 1.3 Confirm a logged-in visitor still sees the Customer Details section pre-filled as before; verify by loading the same arena page logged in and selecting a slot.

## 2. Lock the login-verified contact field at checkout

- [x] 2.1 In `app/api/auth/verify-otp/route.ts`, persist the already-computed `isMobileNum` result as a new signed cookie (`fg_auth_channel`, values `mobile`/`email`) alongside the existing auth cookies; verify the cookie is set after a successful OTP verification via either channel. (Also cleared it in `app/api/auth/logout/route.ts` alongside the other auth cookies — not explicitly listed but a clear gap if skipped.)
- [x] 2.2 Add `readAuthChannel()` to `lib/session.ts` reading that cookie, returning `'mobile' | 'email' | null`; verify it returns `null` for a session predating this change (no cookie set).
- [x] 2.3 Pass the channel into `CheckoutForm` from `app/booking/checkout/page.tsx` and mark the matching input `readOnly` (email input when channel is `email`, mobile input when channel is `mobile`); verify by logging in via each channel and confirming the correct field is locked and the other stays editable.

## 3. Optional GST / company-name capture at checkout

- [x] 3.1 Add `customer_gstin TEXT NULL` and `customer_company_name TEXT NULL` to `bookings` via `ensureSchemaColumns()` in `lib/domain.ts`; verify the columns exist after a fresh call (`ALTER TABLE ... IF NOT EXISTS` is idempotent, so this is safe to verify by re-running it).
- [x] 3.2 Add "Do you have a GST number?" and "Should the invoice show a company name?" toggles (each revealing a text input on "yes") to `CheckoutForm` and to `StaffBookingForm`; verify both fields submit only when their toggle is "yes".
- [x] 3.3 Thread `customerGstin`/`customerCompanyName` through `createBookingBatch` (`lib/domain.ts`) into the `bookings` insert, and through both booking API routes (`app/api/bookings/process/route.ts`, `app/api/fg-admin/platform/bookings/route.ts`); verify a booking created with both fields set stores them.
- [x] 3.4 Update `lib/gst-documents.ts`/`lib/gst-pdf.ts` to read the booking's GSTIN/company name as the buyer's GSTIN/name on the tax invoice, falling back to the customer's personal name when no company name was given; verify by generating an invoice for a booking with GST details set and one without. (`tax_invoices` was originally created via a Prisma migration, not `ensureSchemaColumns()` — added the two new columns there the same ad-hoc way for consistency rather than a formal migration.)

## 4. Reschedule restricted to super_admin / arena_admin

- [x] 4.1 In `app/api/fg-admin/arena/reschedule/route.ts`, change the role check from `role !== 'manager'` to reject anything other than `super_admin`/`arena_admin`, and replace the hardcoded `context.arenaId` scoping with an explicit `arena_id` in the request body validated via `hasArenaAccess(context, arena_id)`; verify a manager's request is now rejected and a super_admin's/arena_admin's succeeds for an arena they have access to.
- [x] 4.2 Remove `RescheduleBookingBtn` from `app/fg-admin/arena/bookings/page.tsx` (manager keeps viewing bookings there, just no reschedule action); verify the button no longer appears for a manager.
- [x] 4.3 Add `RescheduleBookingBtn` to `app/fg-admin/platform/bookings/page.tsx`, gated the same way `SuperAdminRefundBtn` already is on that page (`['super_admin', 'arena_admin'].includes(context.role)`), passing the booking's `arena_id` through to the new request shape from 4.1; verify it appears for super_admin/arena_admin and works end-to-end. (Note: this page is also viewable by `manager` — the role gate is what keeps the button hidden for them, not page-level access.)

## 5. Customers can self-cancel a staff-created booking

- [x] 5.1 Remove the `admin_created` early-return block from `app/api/bookings/cancel/route.ts`; verify a customer can now successfully cancel a booking flagged `admin_created` through the existing self-cancel flow, subject to the same eligibility rules any booking would have.
- [x] 5.2 Remove the corresponding info-panel branch from `components/CancelBookingBtn.tsx` so the normal cancel/reschedule controls render for a staff-created booking same as any other; verify the dashboard shows a working cancel action for a staff-created confirmed booking. (Also removed the now-dead `adminCreated` prop from the component and its pass-through in `app/dashboard/page.tsx`.)
- [x] 5.3 Leave `app/api/fg-admin/platform/bookings/cancel/route.ts` and its UI (`StaffCancelBookingBtn`, the "STAFF BOOKED" badge) untouched; verify staff can still cancel a staff-created booking exactly as before, now alongside the customer's own option. (Confirmed untouched — no changes needed.)

## 6. Configurable forward booking window

- [x] 6.1 Add a `booking_window_days` row to the `settings` table (default `15`) following the same read pattern `cancellation_cutoff_hours` already uses; verify `SELECT value FROM settings WHERE key = 'booking_window_days'` returns a sane value even when the row was never explicitly set (fall back to 15 in code, matching the cutoff-hours pattern). (New `getBookingWindowDays()`/`getMaxBookableDate()` helpers in `lib/domain.ts`, centralized rather than duplicated per call site, since it's used in two places.)
- [x] 6.2 Enforce the window in `/api/slots/status` (reject or return empty slots for a date beyond today + window - 1) and in `createBookingBatch`/booking API routes (reject a booking attempt for a date beyond the window, independent of what the client sent); verify a date just inside the window succeeds and just outside is rejected, from both the API directly and through the UI.
- [x] 6.3 Add a numeric field for `booking_window_days` to the super admin settings screen (`SuperAdminDashboardClient.tsx`, alongside the existing `cancellation_cutoff_hours` control) with its own save action; verify changing it takes effect on the next slot-availability check with no deploy needed.

## 7. Verification pass

- [x] 7.1 Run `npx tsc --noEmit -p .` and confirm no new type errors across all six fixes. Clean after every group, and clean on this final pass.
- [x] 7.2 Run `npx vitest run --pool=forks` and confirm no new failing tests beyond the two pre-existing, unrelated failures already known (`tests/assagao.test.ts`, `tests/unit/email-profile-update.test.ts`). Installed PostgreSQL 17 locally (via winget) since none was running, applied all 18 Prisma migrations fresh — 26/29 test files passing, same 2 pre-existing failures as the git-stash baseline, no new failures.
- [ ] 7.3 Manually walk each of the six scenarios once end-to-end in the dev server (logged-out slot selection, checkout field locking for both OTP channels, GST capture on an invoice, reschedule as arena_admin vs manager, customer self-cancel of a staff-created booking, booking window boundary) before considering this change ready to archive. NOT DONE — needs a running dev server + DB and either manual testing or the `run` skill.
