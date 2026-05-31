-- 005-super-admin-seed.sql
-- Seed data for super admin users

BEGIN;

-- Insert test super admin user
-- Email: superadmin@example.com
-- Password: SuperAdmin@123
-- NOTE: In production, use environment variables from .env for credentials
INSERT INTO "super_admins" (email, password_hash, first_name, last_name, is_active, created_at, updated_at)
VALUES 
  ('superadmin@example.com', '$2a$10$bbjpX2oHSkNinCzPo.P58OY1On33K7SBrU3ekzUb8piwH4JU68Rri', 'Super', 'Admin', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

COMMIT;
