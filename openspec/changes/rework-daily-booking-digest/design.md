## Context

`lib/daily-digest-cron.ts` currently registers one node-cron job (`startDailyDigestCron`, `0 20 * * *`, `Asia/Kolkata`) that queries confirmed bookings for today and tomorrow, then emails a combined digest to `super_admins` + `accountants` (one consolidated all-turf email each) and to each arena's `arena_admins WHERE arena_id = ?` (per-arena email). `lib/email.ts`'s `generateDailyDigestEmail` renders both the arena summary table and the full booking-row table for both days in one template. See `proposal.md` for why this is changing.

`arena_admins` is a dual-role table (see `prisma/schema.prisma`'s comment on the model): `arena_id IS NULL` rows are platform-wide turf admins, `arena_id` set rows are per-turf managers. The current digest code never queries the `arena_id IS NULL` rows at all — turf admins get nothing today.

## Goals / Non-Goals

**Goals:**
- Replace the single 8pm job's content and recipients as specified, without touching the unrelated `booking-reminder-cron.ts` (customer-facing push reminders) or `payment-reminder-cron.ts`.
- Add a second, independent 5am job following the exact same cron/guard/error-handling shape already established by the other four jobs in this codebase.
- Keep both jobs resilient per-recipient and per-arena: one failed send or one arena's query must not abort the rest of the run (matches the existing `try/catch` + `reportServerError` per-recipient pattern).

**Non-Goals:**
- No new database columns or migrations — `payment_status`, `checked_in`, and `booking_date` already carry everything needed.
- No change to `accountants`' login, dashboard, or any other accountant-facing feature — only their digest email subscription is removed.
- No change to how `super_admins`, `arena_admins`, or `accountants` records are created/managed.

## Decisions

**Two email template functions, not one parameterized template.** The 8pm email is counts-only (3 numbers, optionally per-arena breakdown for the consolidated version); the 5am email is a detailed booking-row table. These are different enough shapes that forcing them through `generateDailyDigestEmail`'s existing signature (which assumes both a summary table and a booking-row table, for two dates) would mean threading unused params through both call sites. Instead:
- Add `generateBookingRecapEmail(...)` for the 8pm counts-only content (today's confirmed/cancelled/played counts, with a per-arena breakdown table when scope is "all turfs").
- Repurpose the existing detailed booking-row table markup (the `bookingRow`/table portion of `generateDailyDigestEmail`) into a new `generateMorningBookingListEmail(...)` for the 5am send, single-day only.
- Delete `generateDailyDigestEmail` once both call sites move off it (it becomes dead code).

**Recipient queries stay inline in the cron file**, matching the existing style (raw `query<...>()` calls directly in `lib/daily-digest-cron.ts`) rather than introducing a new `lib/` module for recipient lookup. Three small, distinct queries (super admins, turf admins, per-arena managers) are clearer than one shared helper with a role parameter, and this mirrors how the file already reads today.

**"Played" = `payment_status = 'confirmed' AND checked_in = true`.** `checked_in`/`checked_in_at` (see `bookings` table) is the existing venue check-in signal used elsewhere (security/ticket scanning); no new state is needed to mean "played."

**Both jobs query by `booking_date` = the current IST calendar date only** (no more "tomorrow" query in the 8pm job). Reuse the existing `istDateString(0)` helper already in the file.

**5am job registered as its own `start*Cron` function**, e.g. `startMorningBookingListCron`, added to `instrumentation.ts` next to the other four `start*Cron` calls — matching the one-function-per-schedule convention already established, rather than merging both schedules into one function with an if-branch on the hour.

## Risks / Trade-offs

- **[Risk]** An arena with an active manager but a mistaken `arena_id IS NULL` turf-admin row created by accident could double up or miss recipients. → Mitigation: none needed beyond the existing `arena_id` semantics already relied on elsewhere in the codebase (`lib/admin.ts`'s `getAdminContext`); this change doesn't alter that contract, just queries it correctly for the first time for turf admins.
- **[Risk]** Removing `generateDailyDigestEmail` could break an untested caller. → Mitigation: grep confirms `lib/daily-digest-cron.ts` is its only caller; remove together with its call sites in the same change.
- **[Trade-off]** The 8pm consolidated (all-turf) email needs a per-arena breakdown table to stay useful once it's counts-only rather than a full booking list — this adds one more small query (counts grouped by arena) beyond the three counts. Accepted as necessary; the alternative (three bare numbers with no turf breakdown) would make the consolidated email far less actionable for super admins/turf admins overseeing multiple turfs.

## Migration Plan

No data migration. Deploy the updated cron file and email templates; `instrumentation.ts` picks up the new cron on next server start. No feature flag — both schedules are internal cron jobs with no user-facing surface to stage. Rollback is a plain revert of the two files plus the `instrumentation.ts` registration line.
