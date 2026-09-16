-- Corporate Travel Alert Platform - Supabase Schema
-- Run this in the Supabase SQL editor (prototype).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ADMIN USERS (JWT login) ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- ─── PROFILES (optional; leftover from Supabase Auth) ────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── FLIGHT MODULE ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.flight_import_batches (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name    TEXT NOT NULL,
  total_rows   INT NOT NULL,
  success_rows INT DEFAULT 0,
  failed_rows  INT DEFAULT 0,
  status       TEXT DEFAULT 'processing' CHECK (status IN ('processing','completed','failed')),
  error_log    JSONB,
  imported_by  UUID,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.flight_bookings (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_batch_id             UUID NOT NULL REFERENCES public.flight_import_batches(id),
  pnr                         TEXT NOT NULL,
  ticket_number               TEXT,
  flight_number               TEXT NOT NULL,
  airline_code                TEXT,
  origin                      TEXT NOT NULL,
  destination                 TEXT NOT NULL,
  departure_date              DATE NOT NULL,
  departure_time              TEXT,
  arrival_time                TEXT,
  traveler_name               TEXT NOT NULL,
  traveler_email              TEXT NOT NULL,
  traveler_phone              TEXT NOT NULL,
  status                      TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','active','landed','cancelled','diverted','delayed','unknown')),
  delay_minutes               INT DEFAULT 0,
  gate                        TEXT,
  terminal                    TEXT,
  confirmation_email_sent     BOOLEAN DEFAULT FALSE,
  confirmation_whatsapp_sent  BOOLEAN DEFAULT FALSE,
  last_alert_status           TEXT,
  last_alert_sent_at          TIMESTAMPTZ,
  last_alert_delay_minutes    INT DEFAULT 0,
  created_by                  UUID,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flight_bookings_flight_number  ON public.flight_bookings(flight_number);
CREATE INDEX IF NOT EXISTS idx_flight_bookings_departure_date ON public.flight_bookings(departure_date);
CREATE INDEX IF NOT EXISTS idx_flight_bookings_status         ON public.flight_bookings(status);
CREATE INDEX IF NOT EXISTS idx_flight_bookings_import_batch   ON public.flight_bookings(import_batch_id);

CREATE TABLE IF NOT EXISTS public.flight_status_logs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flight_booking_id UUID NOT NULL REFERENCES public.flight_bookings(id) ON DELETE CASCADE,
  flight_number     TEXT NOT NULL,
  checked_at        TIMESTAMPTZ DEFAULT NOW(),
  raw_response      JSONB,
  status_detected   TEXT,
  delay_minutes     INT
);

CREATE INDEX IF NOT EXISTS idx_flight_status_logs_booking    ON public.flight_status_logs(flight_booking_id);
CREATE INDEX IF NOT EXISTS idx_flight_status_logs_checked_at ON public.flight_status_logs(checked_at);

-- ─── HOTEL MODULE ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hotel_import_batches (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name    TEXT NOT NULL,
  total_rows   INT NOT NULL,
  success_rows INT DEFAULT 0,
  failed_rows  INT DEFAULT 0,
  status       TEXT DEFAULT 'processing' CHECK (status IN ('processing','completed','failed')),
  error_log    JSONB,
  imported_by  UUID,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hotel_bookings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_batch_id       UUID NOT NULL REFERENCES public.hotel_import_batches(id),
  hotel_name            TEXT NOT NULL,
  hotel_email           TEXT,
  hotel_phone           TEXT,
  booking_ref           TEXT NOT NULL,
  check_in_date         DATE NOT NULL,
  check_out_date        DATE,
  room_type             TEXT,
  num_rooms             INT DEFAULT 1,
  traveler_name         TEXT NOT NULL,
  traveler_email        TEXT,
  traveler_phone        TEXT,
  corporate_name        TEXT,
  confirmation_status   TEXT DEFAULT 'pending' CHECK (confirmation_status IN ('pending','awaiting_reply','confirmed','failed','cancelled')),
  confirmation_token    UUID DEFAULT uuid_generate_v4(),
  confirmed_via         TEXT CHECK (confirmed_via IN ('link','whatsapp','email','manual')),
  confirmed_at          TIMESTAMPTZ,
  request_email_sent    BOOLEAN DEFAULT FALSE,
  request_whatsapp_sent BOOLEAN DEFAULT FALSE,
  traveler_notified     BOOLEAN DEFAULT FALSE,
  last_reminder_at      TIMESTAMPTZ,
  created_by            UUID,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotel_bookings_confirmation_token ON public.hotel_bookings(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_status             ON public.hotel_bookings(confirmation_status);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_hotel_phone        ON public.hotel_bookings(hotel_phone);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_import_batch       ON public.hotel_bookings(import_batch_id);

CREATE TABLE IF NOT EXISTS public.hotel_whatsapp_messages (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_booking_id    UUID REFERENCES public.hotel_bookings(id),
  doubletick_msg_id   TEXT,
  from_number         TEXT NOT NULL,
  message_body        TEXT,
  message_type        TEXT,
  direction           TEXT CHECK (direction IN ('inbound','outbound')),
  raw_payload         JSONB,
  received_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotel_whatsapp_from ON public.hotel_whatsapp_messages(from_number);

-- ─── NOTIFICATIONS LOG ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type         TEXT NOT NULL CHECK (entity_type IN ('flight','hotel')),
  entity_id           UUID NOT NULL,
  channel             TEXT NOT NULL CHECK (channel IN ('email','whatsapp')),
  notification_type   TEXT NOT NULL,
  recipient_email     TEXT,
  recipient_phone     TEXT,
  status              TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  provider_message_id TEXT,
  error_message       TEXT,
  sent_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_entity ON public.notification_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON public.notification_logs(sent_at);

CREATE TABLE IF NOT EXISTS public.traveler_replies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type   TEXT NOT NULL CHECK (entity_type IN ('flight', 'hotel')),
  entity_id     UUID NOT NULL,
  channel       TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  from_number   TEXT,
  message_body  TEXT,
  raw_payload   JSONB,
  received_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_traveler_replies_entity      ON public.traveler_replies(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_traveler_replies_received_at ON public.traveler_replies(received_at);

-- ─── UPDATED_AT TRIGGERS ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_flight_bookings_updated_at ON public.flight_bookings;
CREATE TRIGGER trg_flight_bookings_updated_at
  BEFORE UPDATE ON public.flight_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_hotel_bookings_updated_at ON public.hotel_bookings;
CREATE TRIGGER trg_hotel_bookings_updated_at
  BEFORE UPDATE ON public.hotel_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────

ALTER TABLE public.profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_bookings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_import_batches     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_status_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_bookings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_import_batches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_whatsapp_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traveler_replies          ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all" ON public.flight_bookings;
DROP POLICY IF EXISTS "auth_all" ON public.hotel_bookings;
DROP POLICY IF EXISTS "auth_all" ON public.flight_import_batches;
DROP POLICY IF EXISTS "auth_all" ON public.hotel_import_batches;
DROP POLICY IF EXISTS "auth_all" ON public.notification_logs;
DROP POLICY IF EXISTS "auth_all" ON public.flight_status_logs;
DROP POLICY IF EXISTS "auth_all" ON public.hotel_whatsapp_messages;
DROP POLICY IF EXISTS "auth_all" ON public.profiles;
DROP POLICY IF EXISTS "auth_all" ON public.traveler_replies;

CREATE POLICY "auth_all" ON public.flight_bookings         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.hotel_bookings          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.flight_import_batches   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.hotel_import_batches    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.notification_logs       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.flight_status_logs      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.hotel_whatsapp_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.profiles                FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.traveler_replies        FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE IF NOT EXISTS public.app_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON public.app_config;
CREATE POLICY "auth_all" ON public.app_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.app_config (key, value) VALUES
  ('app_url',     'http://localhost:3000'),
  ('cron_secret', 'prototype-cron-secret')
ON CONFLICT (key) DO NOTHING;
