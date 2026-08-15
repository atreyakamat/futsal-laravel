-- AlterTable: add optional day-of-week override to pricings
ALTER TABLE "pricings" ADD COLUMN IF NOT EXISTS "day_of_week" INTEGER;

-- Drop the old flat (arena_id, time_slot) uniqueness — it can't coexist
-- with day-specific override rows sharing the same time_slot.
ALTER TABLE "pricings" DROP CONSTRAINT IF EXISTS "pricings_arena_id_time_slot_key";

-- Partial unique indexes: one "every day" (day_of_week IS NULL) row per
-- (arena_id, time_slot), and separately one row per specific weekday.
CREATE UNIQUE INDEX IF NOT EXISTS "pricings_allday_uidx"
  ON "pricings" ("arena_id", "time_slot")
  WHERE "day_of_week" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "pricings_perday_uidx"
  ON "pricings" ("arena_id", "time_slot", "day_of_week")
  WHERE "day_of_week" IS NOT NULL;

-- CreateTable: arena_holidays
CREATE TABLE IF NOT EXISTS "arena_holidays" (
    "id" SERIAL NOT NULL,
    "arena_id" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "reason" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arena_holidays_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "arena_holidays_arena_id_date_key" ON "arena_holidays"("arena_id", "date");
CREATE INDEX IF NOT EXISTS "arena_holidays_arena_id_idx" ON "arena_holidays"("arena_id");
