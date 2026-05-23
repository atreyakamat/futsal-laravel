-- 002-seed.sql
-- Idempotent demo seed data for first-run

BEGIN;

INSERT INTO users (id, name, phone, email, created_at, updated_at)
VALUES ('11111111-1111-1111-1111-111111111111', 'Demo User', '+10000000000', 'demo@example.com', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO pricings (id, arena_id, description, price_cents, duration_minutes, created_at, updated_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  (SELECT id FROM arenas ORDER BY created_at LIMIT 1),
  'Standard 60min', 5000, 60, now(), now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO settings (key, value, created_at, updated_at)
VALUES ('site.name','Futsal Demo', now(), now())
ON CONFLICT (key) DO NOTHING;

COMMIT;
