-- ============================================================================
-- Pre-launch cleanup: removes ALL bookings and their dependent financial
-- records (tax invoices, credit notes, payment audit logs, PayU callback
-- logs) so the live site starts with a clean slate.
--
-- SAFE TO RUN AS-IS: confirmed against the current schema that no foreign
-- key constraints reference `bookings` (the old approval_requests.booking_id
-- FK was dropped along the way — see prisma/migrations history), so this
-- cannot cascade into anything unexpected. It does NOT touch arenas,
-- pricings, slot_timings, or `users` — customer/player accounts created
-- during testing are left alone (delete them separately if you also want a
-- clean users table; see note at the bottom).
--
-- BEFORE RUNNING THIS ON PRODUCTION:
--   1. Take a backup:  pg_dump "$DATABASE_URL" -F c -f pre-launch-backup.dump
--   2. Read the row counts it prints and make sure they look like "all test
--      bookings", not something surprising.
--
-- Run with:
--   psql "$DATABASE_URL" -f scripts/clear-test-bookings.sql
-- ============================================================================

BEGIN;

\echo 'Rows before cleanup:'
SELECT
  (SELECT COUNT(*) FROM bookings)            AS bookings,
  (SELECT COUNT(*) FROM tax_invoices)        AS tax_invoices,
  (SELECT COUNT(*) FROM credit_notes)        AS credit_notes,
  (SELECT COUNT(*) FROM payment_audit_logs)  AS payment_audit_logs,
  (SELECT COUNT(*) FROM payment_callbacks)   AS payment_callbacks,
  (SELECT COUNT(*) FROM slot_locks)          AS slot_locks;

-- Dependent financial docs are keyed by booking_ref (text), not a real FK,
-- so they have to be cleared explicitly before/alongside bookings.
DELETE FROM credit_notes       WHERE booking_ref IN (SELECT booking_ref FROM bookings);
DELETE FROM tax_invoices       WHERE booking_ref IN (SELECT booking_ref FROM bookings);
DELETE FROM payment_audit_logs WHERE booking_ref IN (SELECT booking_ref FROM bookings);
DELETE FROM payment_callbacks  WHERE booking_ref IN (SELECT booking_ref FROM bookings);

DELETE FROM bookings;

-- Ephemeral slot-hold rows from in-progress checkouts — always safe to clear.
DELETE FROM slot_locks;

\echo 'Rows after cleanup:'
SELECT
  (SELECT COUNT(*) FROM bookings)            AS bookings,
  (SELECT COUNT(*) FROM tax_invoices)        AS tax_invoices,
  (SELECT COUNT(*) FROM credit_notes)        AS credit_notes,
  (SELECT COUNT(*) FROM payment_audit_logs)  AS payment_audit_logs,
  (SELECT COUNT(*) FROM payment_callbacks)   AS payment_callbacks,
  (SELECT COUNT(*) FROM slot_locks)          AS slot_locks;

COMMIT;

-- ----------------------------------------------------------------------------
-- NOT included above — decide these separately, they're not safe to default:
--
-- 1. GST invoice numbering (document_sequences table): if any of the
--    test bookings above had a real Tax Invoice issued against them, its
--    invoice number was consumed from `document_sequences` and won't be
--    reused. If you want your first LIVE invoice to start at 1, reset it:
--      DELETE FROM document_sequences;
--    Only do this if you're certain no test invoice numbers need to stay
--    reserved/void for GST audit purposes — ask your accountant, not me.
--
-- 2. Test customer accounts: createBookingBatch() auto-creates a `users`
--    row (role='player') for every booking made, so test bookings likely
--    left behind test customer accounts too. This script does NOT delete
--    them. If you want those gone as well:
--      DELETE FROM users WHERE role = 'player'
--        AND id NOT IN (SELECT DISTINCT user_id FROM bookings WHERE user_id IS NOT NULL);
--    (safe to run any time after the cleanup above, since it excludes
--    whatever real bookings exist at that point)
-- ----------------------------------------------------------------------------
