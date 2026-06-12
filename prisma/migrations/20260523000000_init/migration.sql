CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified_at TIMESTAMPTZ NULL,
  password TEXT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  remember_token TEXT NULL,
  customer_mobile TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS arenas (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  address TEXT NULL,
  contact_email TEXT NULL,
  contact_phone TEXT NULL,
  logo_url TEXT NULL,
  cover_image TEXT NULL,
  description TEXT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  bot_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  gmaps_link TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pricings (
  id SERIAL PRIMARY KEY,
  arena_id INTEGER NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  time_slot TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (arena_id, time_slot)
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  ticket_number TEXT NULL UNIQUE,
  booking_ref TEXT NULL,
  arena_id INTEGER NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  booking_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_mobile TEXT NOT NULL,
  customer_email TEXT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL DEFAULT 'online',
  notes TEXT NULL,
  checked_in BOOLEAN NOT NULL DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ NULL,
  checked_in_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  is_free_booking BOOLEAN NOT NULL DEFAULT FALSE,
  payu_mihpayid TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bookings_ref_idx ON bookings (booking_ref);
CREATE INDEX IF NOT EXISTS bookings_ticket_idx ON bookings (ticket_number);
CREATE INDEX IF NOT EXISTS bookings_user_idx ON bookings (user_id);
CREATE INDEX IF NOT EXISTS bookings_arena_date_idx ON bookings (arena_id, booking_date);
CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_slot_idx
  ON bookings (arena_id, booking_date, time_slot)
  WHERE payment_status IN ('pending', 'confirmed');

CREATE TABLE IF NOT EXISTS slot_locks (
  id SERIAL PRIMARY KEY,
  arena_id INTEGER NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  session_id TEXT NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (arena_id, booking_date, time_slot)
);

CREATE INDEX IF NOT EXISTS slot_locks_session_idx ON slot_locks (session_id);
CREATE INDEX IF NOT EXISTS slot_locks_expires_idx ON slot_locks (expires_at);

CREATE TABLE IF NOT EXISTS user_otps (
  id SERIAL PRIMARY KEY,
  identifier TEXT NOT NULL UNIQUE,
  otp TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS arena_images (
  id SERIAL PRIMARY KEY,
  arena_id INTEGER NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
