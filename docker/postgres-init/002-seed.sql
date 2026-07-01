-- 002-seed.sql
-- Idempotent demo seed data for first-run

BEGIN;

-- Insert demo superadmin user
INSERT INTO users (name, email, customer_mobile, role, created_at, updated_at)
VALUES ('System Admin', 'admin@futsalgoa.com', '+919999999999', 'super_admin', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert AIEM Assagao
INSERT INTO arenas (name, slug, address, description, status, bot_enabled, created_at, updated_at)
VALUES ('AIEM Assagao', 'aiem-assagao', 'Agnel Technical Educational Complex Assagao, Bardez – Goa 403507', 'AIEM Assagao Premium Futsal Turf', 'active', FALSE, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- Insert pricing for AIEM Assagao
INSERT INTO pricings (arena_id, time_slot, price, created_at, updated_at)
SELECT a.id, time_slot, price, NOW(), NOW()
FROM arenas a, (
  VALUES ('06:00-07:00'::TEXT, 1003::NUMERIC),
         ('07:00-08:00'::TEXT, 1003::NUMERIC),
         ('08:00-09:00'::TEXT, 1003::NUMERIC),
         ('09:00-10:00'::TEXT, 1003::NUMERIC),
         ('10:00-11:00'::TEXT, 1003::NUMERIC),
         ('11:00-12:00'::TEXT, 1003::NUMERIC),
         ('12:00-13:00'::TEXT, 1003::NUMERIC),
         ('13:00-14:00'::TEXT, 1003::NUMERIC),
         ('14:00-15:00'::TEXT, 1003::NUMERIC),
         ('15:00-16:00'::TEXT, 1003::NUMERIC),
         ('16:00-17:00'::TEXT, 1003::NUMERIC),
         ('17:00-18:00'::TEXT, 1003::NUMERIC),
         ('18:00-19:00'::TEXT, 1416::NUMERIC),
         ('19:00-20:00'::TEXT, 1416::NUMERIC),
         ('20:00-21:00'::TEXT, 1416::NUMERIC),
         ('21:00-22:00'::TEXT, 1416::NUMERIC),
         ('22:00-23:00'::TEXT, 1416::NUMERIC),
         ('23:00-00:00'::TEXT, 1416::NUMERIC)
) AS prices(time_slot, price)
WHERE a.slug = 'aiem-assagao'
ON CONFLICT (arena_id, time_slot) DO NOTHING;

-- Insert slot timings for AIEM Assagao
INSERT INTO slot_timings (arena_id, time_slot, start_time, end_time, day_of_week, created_at, updated_at)
SELECT a.id, t.time_slot, t.start_time, t.end_time, NULL, NOW(), NOW()
FROM arenas a, (
  VALUES ('06:00-07:00', '06:00', '07:00'),
         ('07:00-08:00', '07:00', '08:00'),
         ('08:00-09:00', '08:00', '09:00'),
         ('09:00-10:00', '09:00', '10:00'),
         ('10:00-11:00', '10:00', '11:00'),
         ('11:00-12:00', '11:00', '12:00'),
         ('12:00-13:00', '12:00', '13:00'),
         ('13:00-14:00', '13:00', '14:00'),
         ('14:00-15:00', '14:00', '15:00'),
         ('15:00-16:00', '15:00', '16:00'),
         ('16:00-17:00', '16:00', '17:00'),
         ('17:00-18:00', '17:00', '18:00'),
         ('18:00-19:00', '18:00', '19:00'),
         ('19:00-20:00', '19:00', '20:00'),
         ('20:00-21:00', '20:00', '21:00'),
         ('21:00-22:00', '21:00', '22:00'),
         ('22:00-23:00', '22:00', '23:00'),
         ('23:00-00:00', '23:00', '00:00')
) AS t(time_slot, start_time, end_time)
WHERE a.slug = 'aiem-assagao'
ON CONFLICT (arena_id, time_slot, day_of_week) DO NOTHING;

-- Insert settings
INSERT INTO settings (key, value, created_at, updated_at)
VALUES 
  ('site.name', 'FutsalGoa', NOW(), NOW()),
  ('site.description', 'Premium Futsal Booking Platform for Goa', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

COMMIT;
