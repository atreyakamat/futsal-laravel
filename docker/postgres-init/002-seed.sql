-- 002-seed.sql
-- Idempotent demo seed data for first-run

BEGIN;

-- Insert demo arena
INSERT INTO arenas (name, slug, address, description, status, bot_enabled, created_at, updated_at)
VALUES ('Pilar Arena', 'pilar-arena', 'Pilar, Goa', 'Premium futsal arena in Pilar with professional standards.', 'active', FALSE, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- Insert demo superadmin user
INSERT INTO users (name, email, customer_mobile, role, created_at, updated_at)
VALUES ('System Admin', 'admin@futsalgoa.com', '+919999999999', 'super_admin', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert demo admin user
INSERT INTO users (name, email, customer_mobile, role, created_at, updated_at)
VALUES ('Pilar Manager', 'manager@pilar.com', '+919888888888', 'admin', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert demo customer
INSERT INTO users (name, email, customer_mobile, role, created_at, updated_at)
VALUES ('Futsal Player', 'player@example.com', '+919777777777', 'customer', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert pricing for demo arena
INSERT INTO pricings (arena_id, time_slot, price, created_at, updated_at)
SELECT a.id, time_slot, price, NOW(), NOW()
FROM arenas a, (
  VALUES ('06:00-07:00'::TEXT, 300::NUMERIC),
         ('07:00-08:00'::TEXT, 300::NUMERIC),
         ('18:00-19:00'::TEXT, 500::NUMERIC),
         ('19:00-20:00'::TEXT, 500::NUMERIC),
         ('20:00-21:00'::TEXT, 600::NUMERIC),
         ('21:00-22:00'::TEXT, 600::NUMERIC)
) AS prices(time_slot, price)
WHERE a.slug = 'pilar-arena'
ON CONFLICT (arena_id, time_slot) DO NOTHING;

-- Insert settings
INSERT INTO settings (key, value, created_at, updated_at)
VALUES 
  ('site.name', 'FutsalGoa', NOW(), NOW()),
  ('site.description', 'Premium Futsal Booking Platform for Goa', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

COMMIT;
