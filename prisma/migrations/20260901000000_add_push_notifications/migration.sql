-- Web Push notifications: booking-created alerts to super_admin/admin/manager,
-- and a slot-reminder push to the customer 30 minutes before their booking
-- starts. See lib/push.ts and lib/booking-reminder-cron.ts.

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
    "id"         SERIAL PRIMARY KEY,
    "owner_type" TEXT NOT NULL,
    "owner_id"   INTEGER NOT NULL,
    "endpoint"   TEXT NOT NULL,
    "p256dh"     TEXT NOT NULL,
    "auth"       TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_key" ON "push_subscriptions" ("endpoint");
CREATE INDEX IF NOT EXISTS "push_subscriptions_owner_type_owner_id_idx" ON "push_subscriptions" ("owner_type", "owner_id");

-- Dedup marker for the 30-minutes-before reminder cron — set once the push
-- goes out so a booking never gets reminded twice across cron ticks.
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "reminder_sent_at" TIMESTAMP(3);
