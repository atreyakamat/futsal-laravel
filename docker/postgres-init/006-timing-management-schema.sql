-- Add missing columns to support new super admin features
BEGIN;

-- Add columns to slot_approval_requests if they don't exist
ALTER TABLE slot_approval_requests
ADD COLUMN IF NOT EXISTS arena_admin_id INTEGER,
ADD COLUMN IF NOT EXISTS number_of_rounds INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS requested_date TEXT,
ADD COLUMN IF NOT EXISTS time_slot_updated TEXT;

-- Create slot_timings table for arena time slots
CREATE TABLE IF NOT EXISTS "slot_timings" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "arena_id" INTEGER NOT NULL,
  "time_slot" TEXT NOT NULL,
  "start_time" TEXT NOT NULL,
  "end_time" TEXT NOT NULL,
  "day_of_week" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY("arena_id") REFERENCES "arenas"("id") ON DELETE CASCADE,
  UNIQUE("arena_id", "time_slot", "day_of_week")
);

CREATE INDEX IF NOT EXISTS "slot_timings_arena_id_idx" ON "slot_timings"("arena_id");
CREATE INDEX IF NOT EXISTS "slot_timings_time_slot_idx" ON "slot_timings"("time_slot");

-- Create admin_free_bookings table for tracking free bookings requiring approval
CREATE TABLE IF NOT EXISTS "admin_free_bookings" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "arena_admin_id" INTEGER NOT NULL,
  "arena_id" INTEGER NOT NULL,
  "booking_date" TEXT NOT NULL,
  "time_slot" TEXT NOT NULL,
  "number_of_rounds" INTEGER DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "approved_by" INTEGER,
  "rejection_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY("arena_admin_id") REFERENCES "arena_admins"("id") ON DELETE CASCADE,
  FOREIGN KEY("arena_id") REFERENCES "arenas"("id") ON DELETE CASCADE,
  FOREIGN KEY("approved_by") REFERENCES "super_admins"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "admin_free_bookings_arena_id_idx" ON "admin_free_bookings"("arena_id");
CREATE INDEX IF NOT EXISTS "admin_free_bookings_admin_id_idx" ON "admin_free_bookings"("arena_admin_id");
CREATE INDEX IF NOT EXISTS "admin_free_bookings_status_idx" ON "admin_free_bookings"("status");

-- Create admin_slot_blocks table for super admin blocking slots
CREATE TABLE IF NOT EXISTS "admin_slot_blocks" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "super_admin_id" INTEGER,
  "arena_id" INTEGER NOT NULL,
  "booking_date" TEXT NOT NULL,
  "time_slot" TEXT NOT NULL,
  "number_of_rounds" INTEGER DEFAULT 1,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'confirmed',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY("super_admin_id") REFERENCES "super_admins"("id") ON DELETE SET NULL,
  FOREIGN KEY("arena_id") REFERENCES "arenas"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "admin_slot_blocks_arena_id_idx" ON "admin_slot_blocks"("arena_id");
CREATE INDEX IF NOT EXISTS "admin_slot_blocks_super_admin_id_idx" ON "admin_slot_blocks"("super_admin_id");
CREATE INDEX IF NOT EXISTS "admin_slot_blocks_status_idx" ON "admin_slot_blocks"("status");

COMMIT;
