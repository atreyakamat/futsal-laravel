/*
  Warnings:

  - You are about to drop the `admins` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `approval_requests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `arena_images` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `ticket_number` on table `bookings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `booking_ref` on table `bookings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user_id` on table `bookings` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "approval_requests" DROP CONSTRAINT "approval_requests_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "arena_images" DROP CONSTRAINT "arena_images_arena_id_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_arena_id_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_checked_in_by_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_user_id_fkey";

-- DropForeignKey
ALTER TABLE "pricings" DROP CONSTRAINT "pricings_arena_id_fkey";

-- DropForeignKey
ALTER TABLE "slot_locks" DROP CONSTRAINT "slot_locks_arena_id_fkey";

-- DropIndex
DROP INDEX "bookings_arena_date_idx";

-- AlterTable
ALTER TABLE "arenas" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "bookings" ALTER COLUMN "ticket_number" SET NOT NULL,
ALTER COLUMN "booking_ref" SET NOT NULL,
ALTER COLUMN "user_id" SET NOT NULL,
ALTER COLUMN "booking_date" SET DATA TYPE TEXT,
ALTER COLUMN "payment_method" DROP NOT NULL,
ALTER COLUMN "payment_method" DROP DEFAULT,
ALTER COLUMN "checked_in_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "pricings" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "settings" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "slot_locks" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "booking_date" SET DATA TYPE TEXT,
ALTER COLUMN "locked_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user_otps" ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "email_verified_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- DropTable
DROP TABLE "admins";

-- DropTable
DROP TABLE "approval_requests";

-- DropTable
DROP TABLE "arena_images";

-- CreateTable
CREATE TABLE "arena_managers" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "arena_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'manager',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arena_managers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "super_admins" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "super_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arena_admins" (
    "id" SERIAL NOT NULL,
    "arena_id" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arena_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_staff" (
    "id" SERIAL NOT NULL,
    "arena_id" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slot_approval_requests" (
    "id" SERIAL NOT NULL,
    "arena_id" INTEGER NOT NULL,
    "requested_by" INTEGER NOT NULL,
    "request_type" TEXT NOT NULL DEFAULT 'block_slot',
    "booking_date" TEXT NOT NULL,
    "time_slot" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approved_by" INTEGER,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slot_approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" SERIAL NOT NULL,
    "arena_id" INTEGER NOT NULL,
    "report_type" TEXT NOT NULL,
    "report_date" TEXT NOT NULL,
    "date_range_start" TEXT NOT NULL,
    "date_range_end" TEXT NOT NULL,
    "total_bookings" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_attendance" INTEGER NOT NULL DEFAULT 0,
    "avg_duration" INTEGER NOT NULL DEFAULT 0,
    "slot_utilization" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "data" JSONB,
    "generated_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_credentials" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "admin_type" TEXT NOT NULL,
    "credential_token" TEXT NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_audit_logs" (
    "id" SERIAL NOT NULL,
    "super_admin_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" INTEGER,
    "changes" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slot_timings" (
    "id" SERIAL NOT NULL,
    "arena_id" INTEGER NOT NULL,
    "time_slot" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "day_of_week" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slot_timings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_free_bookings" (
    "id" SERIAL NOT NULL,
    "arena_admin_id" INTEGER NOT NULL,
    "arena_id" INTEGER NOT NULL,
    "booking_date" TEXT NOT NULL,
    "time_slot" TEXT NOT NULL,
    "number_of_rounds" INTEGER DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approved_by" INTEGER,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_free_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_slot_blocks" (
    "id" SERIAL NOT NULL,
    "super_admin_id" INTEGER,
    "arena_id" INTEGER NOT NULL,
    "booking_date" TEXT NOT NULL,
    "time_slot" TEXT NOT NULL,
    "number_of_rounds" INTEGER DEFAULT 1,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_slot_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_audit_logs" (
    "id" SERIAL NOT NULL,
    "booking_ref" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "mihpayid" TEXT,
    "payload" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "arena_managers_user_id_key" ON "arena_managers"("user_id");

-- CreateIndex
CREATE INDEX "arena_managers_user_id_idx" ON "arena_managers"("user_id");

-- CreateIndex
CREATE INDEX "arena_managers_arena_id_idx" ON "arena_managers"("arena_id");

-- CreateIndex
CREATE UNIQUE INDEX "super_admins_user_id_key" ON "super_admins"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "super_admins_email_key" ON "super_admins"("email");

-- CreateIndex
CREATE INDEX "super_admins_email_idx" ON "super_admins"("email");

-- CreateIndex
CREATE INDEX "super_admins_is_active_idx" ON "super_admins"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "arena_admins_email_key" ON "arena_admins"("email");

-- CreateIndex
CREATE INDEX "arena_admins_arena_id_idx" ON "arena_admins"("arena_id");

-- CreateIndex
CREATE INDEX "arena_admins_email_idx" ON "arena_admins"("email");

-- CreateIndex
CREATE INDEX "arena_admins_is_active_idx" ON "arena_admins"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "security_staff_email_key" ON "security_staff"("email");

-- CreateIndex
CREATE INDEX "security_staff_arena_id_idx" ON "security_staff"("arena_id");

-- CreateIndex
CREATE INDEX "security_staff_email_idx" ON "security_staff"("email");

-- CreateIndex
CREATE INDEX "security_staff_is_active_idx" ON "security_staff"("is_active");

-- CreateIndex
CREATE INDEX "slot_approval_requests_arena_id_idx" ON "slot_approval_requests"("arena_id");

-- CreateIndex
CREATE INDEX "slot_approval_requests_status_idx" ON "slot_approval_requests"("status");

-- CreateIndex
CREATE INDEX "slot_approval_requests_requested_by_idx" ON "slot_approval_requests"("requested_by");

-- CreateIndex
CREATE INDEX "reports_arena_id_idx" ON "reports"("arena_id");

-- CreateIndex
CREATE INDEX "reports_report_type_idx" ON "reports"("report_type");

-- CreateIndex
CREATE INDEX "reports_report_date_idx" ON "reports"("report_date");

-- CreateIndex
CREATE UNIQUE INDEX "admin_credentials_credential_token_key" ON "admin_credentials"("credential_token");

-- CreateIndex
CREATE INDEX "admin_credentials_admin_id_idx" ON "admin_credentials"("admin_id");

-- CreateIndex
CREATE INDEX "admin_credentials_is_used_idx" ON "admin_credentials"("is_used");

-- CreateIndex
CREATE INDEX "admin_credentials_expires_at_idx" ON "admin_credentials"("expires_at");

-- CreateIndex
CREATE INDEX "system_audit_logs_super_admin_id_idx" ON "system_audit_logs"("super_admin_id");

-- CreateIndex
CREATE INDEX "system_audit_logs_action_idx" ON "system_audit_logs"("action");

-- CreateIndex
CREATE INDEX "system_audit_logs_created_at_idx" ON "system_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "slot_timings_arena_id_idx" ON "slot_timings"("arena_id");

-- CreateIndex
CREATE UNIQUE INDEX "slot_timings_arena_id_time_slot_day_of_week_key" ON "slot_timings"("arena_id", "time_slot", "day_of_week");

-- CreateIndex
CREATE INDEX "admin_free_bookings_arena_id_idx" ON "admin_free_bookings"("arena_id");

-- CreateIndex
CREATE INDEX "admin_free_bookings_arena_admin_id_idx" ON "admin_free_bookings"("arena_admin_id");

-- CreateIndex
CREATE INDEX "admin_free_bookings_status_idx" ON "admin_free_bookings"("status");

-- CreateIndex
CREATE INDEX "admin_slot_blocks_arena_id_idx" ON "admin_slot_blocks"("arena_id");

-- CreateIndex
CREATE INDEX "admin_slot_blocks_super_admin_id_idx" ON "admin_slot_blocks"("super_admin_id");

-- CreateIndex
CREATE INDEX "admin_slot_blocks_status_idx" ON "admin_slot_blocks"("status");

-- CreateIndex
CREATE INDEX "payment_audit_logs_booking_ref_idx" ON "payment_audit_logs"("booking_ref");

-- CreateIndex
CREATE INDEX "arenas_status_idx" ON "arenas"("status");

-- CreateIndex
CREATE INDEX "bookings_arena_id_idx" ON "bookings"("arena_id");

-- CreateIndex
CREATE INDEX "bookings_payment_status_idx" ON "bookings"("payment_status");

-- CreateIndex
CREATE INDEX "pricings_arena_id_idx" ON "pricings"("arena_id");

-- CreateIndex
CREATE INDEX "slot_locks_arena_id_idx" ON "slot_locks"("arena_id");

-- CreateIndex
CREATE INDEX "user_otps_identifier_idx" ON "user_otps"("identifier");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- RenameIndex
ALTER INDEX "bookings_ref_idx" RENAME TO "bookings_booking_ref_idx";

-- RenameIndex
ALTER INDEX "bookings_ticket_idx" RENAME TO "bookings_ticket_number_idx";

-- RenameIndex
ALTER INDEX "bookings_user_idx" RENAME TO "bookings_user_id_idx";

-- RenameIndex
ALTER INDEX "slot_locks_expires_idx" RENAME TO "slot_locks_expires_at_idx";

-- RenameIndex
ALTER INDEX "slot_locks_session_idx" RENAME TO "slot_locks_session_id_idx";
