-- 001-schema.sql
-- Initial database schema for FutsalGoa

BEGIN;

-- CreateTableUsers
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "email_verified_at" TIMESTAMP(3),
  "password" TEXT,
  "customer_mobile" TEXT,
  "role" TEXT NOT NULL DEFAULT 'customer',
  "remember_token" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");

-- CreateTableArenas
CREATE TABLE IF NOT EXISTS "arenas" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "address" TEXT,
  "description" TEXT,
  "cover_image" TEXT,
  "logo_url" TEXT,
  "contact_email" TEXT,
  "contact_phone" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "bot_enabled" BOOLEAN NOT NULL DEFAULT false,
  "gmaps_link" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "arenas_status_idx" ON "arenas"("status");

-- CreateTableBookings
CREATE TABLE IF NOT EXISTS "bookings" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "ticket_number" TEXT NOT NULL UNIQUE,
  "booking_ref" TEXT NOT NULL,
  "user_id" INTEGER NOT NULL,
  "arena_id" INTEGER NOT NULL,
  "booking_date" TEXT NOT NULL,
  "time_slot" TEXT NOT NULL,
  "customer_name" TEXT NOT NULL,
  "customer_mobile" TEXT NOT NULL,
  "customer_email" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "payment_status" TEXT NOT NULL DEFAULT 'pending',
  "payment_method" TEXT,
  "payu_mihpayid" TEXT,
  "notes" TEXT,
  "checked_in" BOOLEAN NOT NULL DEFAULT false,
  "checked_in_at" TIMESTAMP(3),
  "checked_in_by" INTEGER,
  "is_free_booking" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "bookings_booking_ref_idx" ON "bookings"("booking_ref");
CREATE INDEX IF NOT EXISTS "bookings_ticket_number_idx" ON "bookings"("ticket_number");
CREATE INDEX IF NOT EXISTS "bookings_user_id_idx" ON "bookings"("user_id");
CREATE INDEX IF NOT EXISTS "bookings_arena_id_idx" ON "bookings"("arena_id");
CREATE INDEX IF NOT EXISTS "bookings_payment_status_idx" ON "bookings"("payment_status");

-- CreateTablePricings
CREATE TABLE IF NOT EXISTS "pricings" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "arena_id" INTEGER NOT NULL,
  "time_slot" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("arena_id", "time_slot")
);

CREATE INDEX IF NOT EXISTS "pricings_arena_id_idx" ON "pricings"("arena_id");

-- CreateTableSlotLocks
CREATE TABLE IF NOT EXISTS "slot_locks" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "arena_id" INTEGER NOT NULL,
  "booking_date" TEXT NOT NULL,
  "time_slot" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "locked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "slot_locks_arena_id_idx" ON "slot_locks"("arena_id");
CREATE INDEX IF NOT EXISTS "slot_locks_session_id_idx" ON "slot_locks"("session_id");
CREATE INDEX IF NOT EXISTS "slot_locks_expires_at_idx" ON "slot_locks"("expires_at");

-- CreateTableUserOtps
CREATE TABLE IF NOT EXISTS "user_otps" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "identifier" TEXT NOT NULL UNIQUE,
  "otp" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "user_otps_identifier_idx" ON "user_otps"("identifier");

-- CreateTableSettings
CREATE TABLE IF NOT EXISTS "settings" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "value" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTableArenaManagers
CREATE TABLE IF NOT EXISTS "arena_managers" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "user_id" INTEGER NOT NULL UNIQUE,
  "arena_id" INTEGER NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'manager',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "arena_managers_user_id_idx" ON "arena_managers"("user_id");
CREATE INDEX IF NOT EXISTS "arena_managers_arena_id_idx" ON "arena_managers"("arena_id");

COMMIT;
