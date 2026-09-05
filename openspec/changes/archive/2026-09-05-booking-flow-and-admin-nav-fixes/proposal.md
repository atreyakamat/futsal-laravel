## Why

Six defects were found in the live app: a customer's selected slot disappears after the login redirect (forcing re-selection even though the slot is still held server-side); an already OTP-verified email/mobile stays editable outside checkout (the profile page has no lock at all); a manager viewing a booking's QR/ticket has no way back to their own bookings, only a customer-facing "My Bookings" link; managers cannot mark the ground unusable for maintenance (no way to block slots for a specific day or a range of days, including dates beyond the normal 15-day booking window — submitting one currently 403s); the admin header (and its role nav) only renders on `/fg-admin/*` paths, so staff lose all admin navigation the moment they land on a page outside it (e.g. the QR page); and navigation items are duplicated across the Header, the ProfileMenu dropdown, and page-local dashboard sidebars, with a real gap where `arena_admin` gets no top-nav entries at all.

## What Changes

- Fix `BookingSystem.tsx`'s slot-status sync so a slot the server reports as `selected` (already locked by the current session) is reflected back into local selection state, not just filtered out when it lapses — closing the gap where a customer redirected through login sees their held slot as plain "Available".
- Extend the existing OTP-verified-channel lock (today enforced only at checkout) to the profile edit page: whichever contact field (email or mobile) was used to log in via OTP becomes read-only there too, both in the UI and as a server-side guard on the profile update API.
- Make the admin header (with role-appropriate navigation) render for any signed-in staff role on every page, not only `/fg-admin/*` paths — fixing the "manager header only shows sometimes" defect — and add the missing `arena_admin` navigation branch (currently empty).
- Add a "back to bookings" action for staff viewing a booking's QR/ticket page, replacing the customer-facing "Book Again"/"My Bookings" pair with a link back to that role's own bookings list.
- Let managers submit slot-block requests (currently blocked server-side even though the UI renders the form) for a date beyond the normal 15-day booking window, and extend slot blocking (and holiday/full-day closure) to cover a range of days in one submission, not just a single date.
- De-duplicate navigation: the Header top nav becomes the single source of truth per role; `ProfileMenu` drops the role-dashboard links it currently repeats there for staff roles, and page-local dashboard sidebars/card grids drop links that exactly duplicate a Header nav destination.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `booking-and-payment`: selected slots must survive the post-login redirect instead of being dropped; the OTP-verified contact field lock now applies to profile edits as well as checkout.
- `admin-rbac`: the admin navigation (top nav) SHALL be available to every staff role on every page, not only `/fg-admin/*` paths, and SHALL have no role with an empty nav; a staff member viewing a booking's ticket/QR SHALL have a way back to their own bookings list; managers gain the ability to request slot blocks (including beyond the booking window and across a date range), which they cannot do today.

## Impact

- `components/BookingSystem.tsx` (slot-selection state sync)
- `app/dashboard/profile/page.tsx`, `app/api/dashboard/profile/route.ts` (verified-field lock)
- `components/Header.tsx`, `components/ProfileMenu.tsx` (role-based header, arena_admin nav, de-duplication)
- `app/booking/success/[ref]/page.tsx` (staff back-to-bookings action)
- `components/SlotManagementClient.tsx`, `app/api/fg-admin/platform/slots/route.ts`, `app/fg-admin/platform/approvals/page.tsx`, `lib/admin.ts` (manager slot-block permission, date-range blocking)
- `app/fg-admin/platform/super-admin/SuperAdminDashboardClient.tsx`, `app/fg-admin/arena/dashboard/page.tsx`, `app/fg-admin/platform/dashboard/page.tsx` (dashboard link de-duplication)
