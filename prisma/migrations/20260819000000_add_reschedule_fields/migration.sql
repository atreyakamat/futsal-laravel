-- Reschedule-instead-of-refund: a confirmed booking can be moved to a new
-- slot once (same slot count, contiguous, same date, total price <= the
-- original total), at least 24h before the original slot start, within 30
-- days of the original booking date. No refund is issued for the move —
-- see lib/domain.ts's rescheduleBooking().
ALTER TABLE "bookings" ADD COLUMN     "rescheduled_from_ref" TEXT,
ADD COLUMN     "rescheduled_to_ref" TEXT,
ADD COLUMN     "reschedule_used" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS bookings_rescheduled_from_ref_idx ON "bookings" ("rescheduled_from_ref");
