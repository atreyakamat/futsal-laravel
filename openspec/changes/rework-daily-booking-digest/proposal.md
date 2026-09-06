## Why

The current 8pm daily digest (`lib/daily-digest-cron.ts`) sends a combined today+tomorrow booking list to super admins and accountants (all turfs) and to each arena's managers, but that no longer matches who actually needs this information: accountants have no operational use for it, managers need a same-day heads-up before the day starts (not just an evening recap), and platform-wide turf admins (the `arena_admins` rows with `arena_id IS NULL`) are currently left out entirely even though they sit one tier below super admin. The digest content itself is also mismatched to its 8pm slot — a forward-looking "tomorrow" list is more useful in the morning, while the evening is better suited to an end-of-day recap.

## What Changes

- **BREAKING**: Accountants no longer receive any daily digest email. The `accountants` query and send loop are removed from `lib/daily-digest-cron.ts` entirely.
- The existing 8pm IST cron becomes an end-of-day recap for **today only** (the "tomorrow" section is dropped): count of bookings confirmed today, count cancelled today, and count played today (confirmed AND checked in). Sent as:
  - one consolidated all-turfs email to super admins (`super_admins`) and platform-wide turf admins (`arena_admins` where `arena_id IS NULL`), and
  - one per-arena email, scoped to that arena's own today-stats, to each arena's managers (`arena_admins` where `arena_id` = that arena).
- A **new** 5am IST cron sends managers (per arena, same `arena_admins WHERE arena_id = ...` scoping) the detailed list of that day's bookings (time slot, customer name, mobile, amount) — the same table shape the old per-arena digest used — so managers have the day's schedule before it starts. Super admins and turf admins do not receive this email.
- `lib/email.ts` gains a new stats-recap template (or an adapted `generateDailyDigestEmail`) for the 8pm counts-only email, distinct from the existing detailed-list template now reused for the 5am email.

## Capabilities

### Modified Capabilities
- `customer-notifications`: adds the first documented operational (non-customer-facing) SES email requirement — the two admin/manager daily digest emails, their recipients, scoping, and content — and removes accountants as a recipient of any booking digest.

## Impact

- `lib/daily-digest-cron.ts`: rewrite `sendDailyDigest` (today-only stats, new recipient set, no accountants) and add `sendMorningBookingList` (or similar) plus `startMorningBookingListCron`.
- `lib/email.ts`: add/adjust digest email template function(s) for the counts-recap (8pm) vs. detailed-list (5am) content.
- `instrumentation.ts`: register the new 5am cron start alongside the existing four cron starts.
- No schema changes — uses existing `bookings.payment_status`, `bookings.checked_in`, `bookings.booking_date`, and existing `super_admins` / `arena_admins` tables (no `accountants` query anymore).
