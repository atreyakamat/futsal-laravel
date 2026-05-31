-- 004-super-admin-schema.sql
-- Super Admin dashboard schema for FutsalGoa

BEGIN;

-- CreateTableSuperAdmins
CREATE TABLE IF NOT EXISTS "super_admins" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "first_name" TEXT,
  "last_name" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_login" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "super_admins_email_idx" ON "super_admins"("email");
CREATE INDEX IF NOT EXISTS "super_admins_is_active_idx" ON "super_admins"("is_active");

-- CreateTableArenaAdmins
CREATE TABLE IF NOT EXISTS "arena_admins" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "arena_id" INTEGER NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "first_name" TEXT,
  "last_name" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_login" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY("arena_id") REFERENCES "arenas"("id")
);

CREATE INDEX IF NOT EXISTS "arena_admins_arena_id_idx" ON "arena_admins"("arena_id");
CREATE INDEX IF NOT EXISTS "arena_admins_email_idx" ON "arena_admins"("email");
CREATE INDEX IF NOT EXISTS "arena_admins_is_active_idx" ON "arena_admins"("is_active");

-- CreateTableSecurityStaff
CREATE TABLE IF NOT EXISTS "security_staff" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "arena_id" INTEGER NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "first_name" TEXT,
  "last_name" TEXT,
  "phone" TEXT,
  "permissions" TEXT DEFAULT '[]',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_login" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY("arena_id") REFERENCES "arenas"("id")
);

CREATE INDEX IF NOT EXISTS "security_staff_arena_id_idx" ON "security_staff"("arena_id");
CREATE INDEX IF NOT EXISTS "security_staff_email_idx" ON "security_staff"("email");
CREATE INDEX IF NOT EXISTS "security_staff_is_active_idx" ON "security_staff"("is_active");

-- CreateTableSlotApprovalRequests
CREATE TABLE IF NOT EXISTS "slot_approval_requests" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "arena_id" INTEGER NOT NULL,
  "admin_id" INTEGER,
  "booking_date" TEXT NOT NULL,
  "time_slot" TEXT NOT NULL,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "requested_by_email" TEXT,
  "approved_by" INTEGER,
  "rejection_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY("arena_id") REFERENCES "arenas"("id"),
  FOREIGN KEY("admin_id") REFERENCES "arena_admins"("id"),
  FOREIGN KEY("approved_by") REFERENCES "super_admins"("id")
);

CREATE INDEX IF NOT EXISTS "slot_approval_requests_arena_id_idx" ON "slot_approval_requests"("arena_id");
CREATE INDEX IF NOT EXISTS "slot_approval_requests_admin_id_idx" ON "slot_approval_requests"("admin_id");
CREATE INDEX IF NOT EXISTS "slot_approval_requests_status_idx" ON "slot_approval_requests"("status");
CREATE INDEX IF NOT EXISTS "slot_approval_requests_created_at_idx" ON "slot_approval_requests"("created_at");

-- CreateTableReports
CREATE TABLE IF NOT EXISTS "reports" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "arena_id" INTEGER NOT NULL,
  "report_type" TEXT NOT NULL,
  "date_range_start" TEXT NOT NULL,
  "date_range_end" TEXT NOT NULL,
  "total_bookings" INTEGER DEFAULT 0,
  "total_revenue" DECIMAL(10,2) DEFAULT 0,
  "total_visitors" INTEGER DEFAULT 0,
  "average_duration" DECIMAL(5,2) DEFAULT 0,
  "peak_hours" TEXT DEFAULT '[]',
  "report_data" TEXT,
  "created_by" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY("arena_id") REFERENCES "arenas"("id"),
  FOREIGN KEY("created_by") REFERENCES "super_admins"("id")
);

CREATE INDEX IF NOT EXISTS "reports_arena_id_idx" ON "reports"("arena_id");
CREATE INDEX IF NOT EXISTS "reports_report_type_idx" ON "reports"("report_type");
CREATE INDEX IF NOT EXISTS "reports_created_at_idx" ON "reports"("created_at");

-- CreateTableAdminCredentials
CREATE TABLE IF NOT EXISTS "admin_credentials" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "admin_email" TEXT NOT NULL,
  "temporary_password" TEXT NOT NULL,
  "is_used" BOOLEAN NOT NULL DEFAULT false,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "admin_credentials_admin_email_idx" ON "admin_credentials"("admin_email");
CREATE INDEX IF NOT EXISTS "admin_credentials_expires_at_idx" ON "admin_credentials"("expires_at");

-- CreateTableSystemAuditLogs
CREATE TABLE IF NOT EXISTS "system_audit_logs" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "super_admin_id" INTEGER NOT NULL,
  "action_type" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" INTEGER,
  "changes" TEXT,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY("super_admin_id") REFERENCES "super_admins"("id")
);

CREATE INDEX IF NOT EXISTS "system_audit_logs_super_admin_id_idx" ON "system_audit_logs"("super_admin_id");
CREATE INDEX IF NOT EXISTS "system_audit_logs_action_type_idx" ON "system_audit_logs"("action_type");
CREATE INDEX IF NOT EXISTS "system_audit_logs_entity_type_idx" ON "system_audit_logs"("entity_type");
CREATE INDEX IF NOT EXISTS "system_audit_logs_created_at_idx" ON "system_audit_logs"("created_at");

COMMIT;
