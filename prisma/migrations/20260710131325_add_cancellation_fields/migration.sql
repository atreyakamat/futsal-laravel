/*
  Warnings:

  - You are about to drop the column `avg_duration` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `data` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `generated_by` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `report_date` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `slot_utilization` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `total_attendance` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `reports` table. All the data in the column will be lost.
  - You are about to alter the column `total_revenue` on the `reports` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(10,2)`.

*/
-- DropIndex
DROP INDEX "reports_report_date_idx";

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "cancellation_reason" TEXT,
ADD COLUMN     "cancellation_requested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "refund_amount" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "reports" DROP COLUMN "avg_duration",
DROP COLUMN "data",
DROP COLUMN "generated_by",
DROP COLUMN "report_date",
DROP COLUMN "slot_utilization",
DROP COLUMN "total_attendance",
DROP COLUMN "updated_at",
ADD COLUMN     "average_duration" DECIMAL(5,2) DEFAULT 0,
ADD COLUMN     "created_by" INTEGER,
ADD COLUMN     "peak_hours" TEXT DEFAULT '[]',
ADD COLUMN     "report_data" TEXT,
ADD COLUMN     "total_visitors" INTEGER DEFAULT 0,
ALTER COLUMN "total_bookings" DROP NOT NULL,
ALTER COLUMN "total_revenue" DROP NOT NULL,
ALTER COLUMN "total_revenue" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "system_audit_logs" ADD COLUMN     "approved_by" INTEGER,
ADD COLUMN     "arena_id" INTEGER,
ADD COLUMN     "field_changed" TEXT,
ADD COLUMN     "new_value" TEXT,
ADD COLUMN     "old_value" TEXT,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "requested_by" INTEGER,
ALTER COLUMN "super_admin_id" DROP NOT NULL,
ALTER COLUMN "entity_type" DROP NOT NULL,
ALTER COLUMN "changes" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "request_type" TEXT,
    "arena_id" INTEGER,
    "status" TEXT,
    "approver_id" INTEGER,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revoked_sessions" (
    "id" SERIAL NOT NULL,
    "session_id" TEXT NOT NULL,
    "revoked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revoked_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_callbacks" (
    "id" SERIAL NOT NULL,
    "booking_ref" TEXT NOT NULL,
    "gateway_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_callbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_role_idx" ON "notifications"("role");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "revoked_sessions_session_id_key" ON "revoked_sessions"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_callbacks_gateway_id_key" ON "payment_callbacks"("gateway_id");

-- CreateIndex
CREATE INDEX "payment_callbacks_booking_ref_idx" ON "payment_callbacks"("booking_ref");

-- CreateIndex
CREATE INDEX "payment_callbacks_gateway_id_idx" ON "payment_callbacks"("gateway_id");

-- CreateIndex
CREATE INDEX "reports_created_at_idx" ON "reports"("created_at");
