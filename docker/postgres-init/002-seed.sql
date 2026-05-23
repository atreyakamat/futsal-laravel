-- 002-seed.sql
-- Idempotent demo seed data for first-run

BEGIN;

INSERT INTO arenas (name, slug, address, description, status, bot_enabled, created_at, updated_at)
VALUES ('Angle Futsal', 'angle-futsal', 'Sample Address', 'Starter arena created for first-run environments.', 'active', FALSE, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

INSERT INTO users (name, email, password, customer_mobile, created_at, updated_at)
VALUES ('Angle Futsal Guest', 'demo@example.com', '$2a$10$NDRVkc0jgROSDrWdYjA8T.JX51bQVpnCxtjnhOSzsnp4sS5DHOEKu', '+10000000000', now(), now())
ON CONFLICT (email) DO NOTHING;

INSERT INTO pricings (arena_id, time_slot, price, day_of_week, created_at, updated_at)
VALUES
  ((SELECT id FROM arenas WHERE slug = 'angle-futsal' LIMIT 1), '18:00-19:00', 5000, 1, now(), now()),
  ((SELECT id FROM arenas WHERE slug = 'angle-futsal' LIMIT 1), '19:00-20:00', 6500, 2, now(), now())
ON CONFLICT (arena_id, time_slot, day_of_week) DO NOTHING;

INSERT INTO settings (key, value, created_at, updated_at)
VALUES ('site.name','Angle Futsal', now(), now())
ON CONFLICT (key) DO NOTHING;

COMMIT;
