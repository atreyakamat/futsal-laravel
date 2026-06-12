ALTER TABLE approval_requests
  ALTER COLUMN booking_id DROP NOT NULL;

ALTER TABLE approval_requests
  ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'slot_template_update',
  ADD COLUMN IF NOT EXISTS arena_id INTEGER NULL REFERENCES arenas(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS requested_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payload_json TEXT NULL,
  ADD COLUMN IF NOT EXISTS decision_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS decision_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS decision_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ NULL;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  actor_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  arena_id INTEGER NULL REFERENCES arenas(id) ON DELETE SET NULL,
  entity_type TEXT NULL,
  entity_id TEXT NULL,
  before_json TEXT NULL,
  after_json TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_actor_idx ON admin_audit_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS admin_audit_logs_arena_idx ON admin_audit_logs (arena_id);
