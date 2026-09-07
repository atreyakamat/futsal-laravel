-- ============================================================================
-- Pre-launch cleanup (FULL): removes all demo/test data before going live.
--
-- This is scripts/clear-test-bookings.sql plus the two extra steps it
-- deliberately left as opt-in:
--   1. Bookings + dependent financial records (tax invoices, credit notes,
--      payment audit logs, PayU callback logs) + slot locks.
--   2. document_sequences reset, so the first LIVE invoice starts at #1.
--      Only do this if no test invoice numbers need to stay reserved/void
--      for GST audit purposes.
--   3. Orphaned test player accounts (role='player' with zero remaining
--      bookings after step 1).
--
-- Does NOT touch arenas, pricings, slot_timings, or admin/staff users.
--
-- BEFORE RUNNING THIS ON PRODUCTION:
--   1. Take a backup:
--        pg_dump "$DATABASE_URL" -F c -f pre-launch-backup.dump
--      (or: docker exec <postgres_container> pg_dump -U <user> -d <db> -F c -f /tmp/pre-launch-backup.dump)
--   2. Read the "Rows before cleanup" counts and make sure they look like
--      "all test data", not something surprising.
--
-- Run with:
--   psql "$DATABASE_URL" -f scripts/pre-launch-cleanup-full.sql
-- ============================================================================

BEGIN;

\echo 'Rows before cleanup:'
SELECT
  (SELECT COUNT(*) FROM bookings)            AS bookings,
  (SELECT COUNT(*) FROM tax_invoices)        AS tax_invoices,
  (SELECT COUNT(*) FROM credit_notes)        AS credit_notes,
  (SELECT COUNT(*) FROM payment_audit_logs)  AS payment_audit_logs,
  (SELECT COUNT(*) FROM payment_callbacks)   AS payment_callbacks,
  (SELECT COUNT(*) FROM slot_locks)          AS slot_locks,
  (SELECT COUNT(*) FROM document_sequences)  AS document_sequences,
  (SELECT COUNT(*) FROM users WHERE role = 'player') AS player_users;

-- 1. Dependent financial docs are keyed by booking_ref (text), not a real
--    FK, so they must be cleared explicitly before/alongside bookings.
DELETE FROM credit_notes       WHERE booking_ref IN (SELECT booking_ref FROM bookings);
DELETE FROM tax_invoices       WHERE booking_ref IN (SELECT booking_ref FROM bookings);
DELETE FROM payment_audit_logs WHERE booking_ref IN (SELECT booking_ref FROM bookings);
DELETE FROM payment_callbacks  WHERE booking_ref IN (SELECT booking_ref FROM bookings);

DELETE FROM bookings;

-- Ephemeral slot-hold rows from in-progress checkouts — always safe to clear.
DELETE FROM slot_locks;

-- 2. Reset GST invoice numbering so the first live invoice starts at #1.
DELETE FROM document_sequences;

-- 3. Remove test player accounts that have no remaining bookings (safe:
--    excludes whatever real bookings exist at this point in the transaction).
DELETE FROM users WHERE role = 'player'
  AND id NOT IN (SELECT DISTINCT user_id FROM bookings WHERE user_id IS NOT NULL);

\echo 'Rows after cleanup:'
SELECT
  (SELECT COUNT(*) FROM bookings)            AS bookings,
  (SELECT COUNT(*) FROM tax_invoices)        AS tax_invoices,
  (SELECT COUNT(*) FROM credit_notes)        AS credit_notes,
  (SELECT COUNT(*) FROM payment_audit_logs)  AS payment_audit_logs,
  (SELECT COUNT(*) FROM payment_callbacks)   AS payment_callbacks,
  (SELECT COUNT(*) FROM slot_locks)          AS slot_locks,
  (SELECT COUNT(*) FROM document_sequences)  AS document_sequences,
  (SELECT COUNT(*) FROM users WHERE role = 'player') AS player_users;

COMMIT;
