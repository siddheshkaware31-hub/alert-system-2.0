-- Apply on an existing database that already ran the original schema.sql

CREATE TABLE IF NOT EXISTS public.admin_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.flight_import_batches DROP CONSTRAINT IF EXISTS flight_import_batches_imported_by_fkey;
ALTER TABLE public.hotel_import_batches DROP CONSTRAINT IF EXISTS hotel_import_batches_imported_by_fkey;
ALTER TABLE public.flight_bookings DROP CONSTRAINT IF EXISTS flight_bookings_created_by_fkey;
ALTER TABLE public.hotel_bookings DROP CONSTRAINT IF EXISTS hotel_bookings_created_by_fkey;

ALTER TABLE public.flight_bookings ADD COLUMN IF NOT EXISTS last_alert_delay_minutes INT DEFAULT 0;

ALTER TABLE public.hotel_bookings ADD COLUMN IF NOT EXISTS corporate_name TEXT;
ALTER TABLE public.hotel_bookings ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;
ALTER TABLE public.hotel_bookings ALTER COLUMN check_out_date DROP NOT NULL;
ALTER TABLE public.hotel_bookings ALTER COLUMN traveler_email DROP NOT NULL;

ALTER TABLE public.hotel_bookings DROP CONSTRAINT IF EXISTS hotel_bookings_confirmation_status_check;
ALTER TABLE public.hotel_bookings
  ADD CONSTRAINT hotel_bookings_confirmation_status_check
  CHECK (confirmation_status IN ('pending','awaiting_reply','confirmed','failed','cancelled'));

ALTER TABLE public.hotel_bookings DROP CONSTRAINT IF EXISTS hotel_bookings_confirmed_via_check;
ALTER TABLE public.hotel_bookings
  ADD CONSTRAINT hotel_bookings_confirmed_via_check
  CHECK (confirmed_via IS NULL OR confirmed_via IN ('link','whatsapp','email','manual'));
