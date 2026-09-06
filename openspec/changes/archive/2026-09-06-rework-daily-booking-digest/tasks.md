## 1. Email templates (`lib/email.ts`)

- [x] 1.1 Add `generateBookingRecapEmail(params)` producing the 8pm counts-only email: today's confirmed/cancelled/played counts, plus a per-arena breakdown table when `scopeLabel` is the all-turfs consolidated view (single-arena scope shows just the three counts). Verify by unit-testing the returned `subject`/`html`/`text` for both an all-turfs and a single-arena input, including a zero-bookings-today case.
- [x] 1.2 Add `generateMorningBookingListEmail(params)` reusing the existing detailed booking-row table markup (time slot, customer name, mobile, amount) for a single arena/day. Verify with a unit test covering a populated list and an empty-list ("no bookings today") case.
- [x] 1.3 Remove `generateDailyDigestEmail` and its now-unused `DigestArenaSummary`/`DigestBookingRow` exports if fully superseded by 1.1/1.2, or keep+rename the interfaces if reused — confirm via `grep -r generateDailyDigestEmail` that no callers remain outside the files touched in this change.

## 2. Cron logic (`lib/daily-digest-cron.ts`)

- [x] 2.1 Add a `getBookingCountsForArena(date, arenaId?)` (or reuse `getBookingsForDate` plus in-memory aggregation) that returns confirmed/cancelled/played counts for today, scoped by `booking_date` and optionally `arena_id`. Verify by checking the SQL against the existing `bookings`/`arenas` join pattern already in the file and confirming `checked_in` is included in the played count.
- [x] 2.2 Rewrite `sendDailyDigest` to: query today only (drop the tomorrow query), fetch `super_admins` (active) and platform-wide turf admins (`arena_admins WHERE arena_id IS NULL AND is_active = true`) and send each the consolidated `generateBookingRecapEmail`, then for each active arena fetch its managers (`arena_admins WHERE arena_id = ? AND is_active = true`) and send each the arena-scoped `generateBookingRecapEmail`. Remove the `accountants` query and send loop entirely. Verify by running the function against a local/test DB fixture with sample bookings in two arenas plus at least one cancelled and one checked-in booking, and confirming the recipient list and counts sent.
- [x] 2.3 Add `sendMorningBookingList` following the same per-arena manager query as 2.2, sending `generateMorningBookingListEmail` with today's booking rows for that arena only (no super admin / turf admin send). Verify with a fixture arena that has bookings and one with none, confirming both still receive an email (empty-state included) and no non-manager recipient is queried or emailed.
- [x] 2.4 Add `startMorningBookingListCron()` mirroring `startDailyDigestCron`'s guard/cron/error-handling shape, scheduled `'0 5 * * *'` with `timezone: 'Asia/Kolkata'`, calling `sendMorningBookingList` inside the same `try/catch` + `reportServerError` pattern. Verify by reading the registered cron expression back via `cron.getTasks()` or by inspecting the schedule string in code review, since node-cron jobs aren't easily unit-triggered.

## 3. Registration and cleanup

- [x] 3.1 Import and call `startMorningBookingListCron()` from `instrumentation.ts` alongside the existing four `start*Cron()` calls. Verify by starting the dev server and checking the console log line for the new cron's startup message (matching the existing `[daily-digest-cron]`-style log format).
- [x] 3.2 Update any existing tests referencing `sendDailyDigest`'s today+tomorrow behavior or `generateDailyDigestEmail` to match the new today-only recap and split templates. Run `npx vitest --pool=forks` and confirm the updated suite passes.

## 4. Verification

- [ ] 4.1 Manually trigger `sendDailyDigest()` and `sendMorningBookingList()` against a seeded dev database (or a script under `scripts/`) and confirm via logs/inbox that: accountants receive nothing from either job, super admins and turf admins receive one consolidated 8pm email each, and every arena's managers receive both a scoped 8pm recap and a 5am booking list.
