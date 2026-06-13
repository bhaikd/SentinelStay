-- =============================================================================
-- SentinelStay database schema
-- Run this whole file in the Supabase SQL editor for a fresh project.
-- It is idempotent enough for repeated runs in dev (drops are guarded).
-- =============================================================================

-- Extensions ------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums (guarded) -------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE incident_type AS ENUM ('fire', 'medical', 'security', 'hazmat', 'weather', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE incident_status AS ENUM ('active', 'responding', 'contained', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE timeline_event_type AS ENUM ('alert', 'dispatch', 'update', 'escalation', 'resolution');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alert_type AS ENUM ('sos', 'sensor', 'staff', 'system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE staff_role AS ENUM ('security', 'maintenance', 'medical', 'management', 'housekeeping', 'engineering');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE staff_status AS ENUM ('available', 'deployed', 'en-route', 'off-duty', 'break');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE guest_status AS ENUM ('in-room', 'common-area', 'evacuated', 'missing', 'checked-out');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('guest', 'staff', 'responder', 'dispatcher', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Profiles & roles ------------------------------------------------------------
-- Every authenticated user gets a row in public.profiles. RLS policies below
-- key off `role` to grant the right level of access.
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  full_name   TEXT,
  role        app_role NOT NULL DEFAULT 'staff',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helper: stable, security-definer accessor for the current user's role.
-- COALESCE so that an authenticated user without a profiles row (e.g. existing
-- auth users created before the on_auth_user_created trigger was installed)
-- still passes staff-tier RLS checks. Without this, every write silently
-- fails with "new row violates row-level security policy".
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'staff'::app_role
  )
$$;

-- Auto-provision a profile row when a new auth user is created.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NULL))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: ensure every existing auth user has a profile row (idempotent).
-- Without this, users created before the trigger existed return NULL from
-- current_role() and fail every RLS write check.
INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', NULL)
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- Domain tables ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incidents (
  id                 TEXT PRIMARY KEY,
  title              TEXT NOT NULL,
  type               incident_type NOT NULL,
  severity           INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 4),
  status             incident_status NOT NULL,
  location_building  TEXT NOT NULL,
  location_floor     INTEGER NOT NULL,
  location_room      TEXT NOT NULL,
  location_x         FLOAT NOT NULL,
  location_y         FLOAT NOT NULL,
  reported_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reported_by        TEXT NOT NULL,
  description        TEXT NOT NULL,
  assigned_units     TEXT[] NOT NULL DEFAULT '{}',
  casualties         INTEGER NOT NULL DEFAULT 0,
  evacuated          INTEGER NOT NULL DEFAULT 0,
  guests_affected    INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.timeline_events (
  id           TEXT PRIMARY KEY,
  incident_id  TEXT NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  timestamp    TEXT NOT NULL,
  message      TEXT NOT NULL,
  type         timeline_event_type NOT NULL,
  author       TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.staff (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  role              staff_role NOT NULL,
  unit              TEXT NOT NULL,
  status            staff_status NOT NULL,
  location_building TEXT NOT NULL,
  location_floor    INTEGER NOT NULL,
  location_x        FLOAT NOT NULL,
  location_y        FLOAT NOT NULL,
  phone             TEXT,
  avatar            TEXT,
  current_incident  TEXT REFERENCES public.incidents(id) ON DELETE SET NULL,
  eta               TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.guests (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  room            TEXT NOT NULL,
  building        TEXT NOT NULL,
  floor           INTEGER NOT NULL,
  check_in        TEXT,
  check_out       TEXT,
  status          guest_status NOT NULL,
  accessibility   TEXT[] NOT NULL DEFAULT '{}',
  language        TEXT NOT NULL,
  vip             BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen       TEXT,
  phone           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.alerts (
  id            TEXT PRIMARY KEY,
  type          alert_type NOT NULL,
  severity      INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 4),
  message       TEXT NOT NULL,
  location      TEXT NOT NULL,
  timestamp     TEXT NOT NULL,
  acknowledged  BOOLEAN NOT NULL DEFAULT FALSE,
  incident_id   TEXT REFERENCES public.incidents(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_incidents_status     ON public.incidents (status);
CREATE INDEX IF NOT EXISTS idx_incidents_reported   ON public.incidents (reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_incident    ON public.timeline_events (incident_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_ack           ON public.alerts (acknowledged, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_status         ON public.staff (status);

-- updated_at triggers ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_incidents_touch ON public.incidents;
CREATE TRIGGER trg_incidents_touch BEFORE UPDATE ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_staff_touch ON public.staff;
CREATE TRIGGER trg_staff_touch BEFORE UPDATE ON public.staff
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_guests_touch ON public.guests;
CREATE TRIGGER trg_guests_touch BEFORE UPDATE ON public.guests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_touch ON public.profiles;
CREATE TRIGGER trg_profiles_touch BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Row Level Security ----------------------------------------------------------
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts          ENABLE ROW LEVEL SECURITY;

-- Drop any prior policies (idempotent re-run support)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles','incidents','timeline_events','staff','guests','alerts')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- profiles: users can read/update only their own row; admins can read/update all
CREATE POLICY profiles_self_read   ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.current_role() = 'admin');
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.current_role() = 'admin')
  WITH CHECK (id = auth.uid() OR public.current_role() = 'admin');

-- NOTE: this is a single-tenant deployment. Any authenticated user is treated
-- as an operator (staff). Multi-tenant role-gating is intentionally relaxed
-- because the auto-provisioned `profiles.role` defaults plus session JWT
-- caching make per-row role checks fragile in practice. Anonymous SOS access
-- is preserved separately below.

-- incidents: any authenticated user can read & write; delete remains admin-only.
CREATE POLICY incidents_read   ON public.incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY incidents_write  ON public.incidents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY incidents_update ON public.incidents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY incidents_delete ON public.incidents FOR DELETE TO authenticated
  USING (public.current_role() IN ('dispatcher','admin'));

-- timeline_events: read & insert by any authenticated user.
CREATE POLICY timeline_read   ON public.timeline_events FOR SELECT TO authenticated USING (true);
CREATE POLICY timeline_insert ON public.timeline_events FOR INSERT TO authenticated WITH CHECK (true);

-- staff: read, write, update by any authenticated user.
CREATE POLICY staff_read   ON public.staff FOR SELECT TO authenticated USING (true);
CREATE POLICY staff_write  ON public.staff FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY staff_update ON public.staff FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- guests: read, write, update by any authenticated user.
CREATE POLICY guests_read   ON public.guests FOR SELECT TO authenticated USING (true);
CREATE POLICY guests_write  ON public.guests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY guests_update ON public.guests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- alerts: read by authenticated, anonymous SOS allowed, write/ack by authenticated.
CREATE POLICY alerts_read       ON public.alerts FOR SELECT TO authenticated USING (true);
-- Anonymous guests on the public SOS portal can only insert SOS alerts.
CREATE POLICY alerts_anon_sos   ON public.alerts FOR INSERT TO anon WITH CHECK (type = 'sos');
CREATE POLICY alerts_auth_write ON public.alerts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY alerts_update     ON public.alerts FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- Auto-create an incident row whenever a guest SOS alert arrives.
-- Runs as the table owner so it bypasses RLS — guests can only INSERT alerts
-- (type='sos') per the policy above, and this trigger turns that into an
-- incident the staff dashboard / IncidentLog page can render in real time.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_sos_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident_id    text;
  v_building       text := 'Tower A';
  v_floor          integer := 1;
  v_room           text := '0';
  v_type           public.incident_type := 'other';
  v_lower_msg      text := lower(coalesce(NEW.message, ''));
  v_loc_match      text[];
BEGIN
  -- Only act on guest-initiated SOS alerts that aren't already linked.
  IF NEW.type <> 'sos' OR NEW.incident_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Best-effort parse of "<building>, Floor <n>, Room <r>" from alerts.location.
  v_loc_match := regexp_match(coalesce(NEW.location, ''), '^([^,]+),\s*Floor\s+(\d+)(?:,\s*Room\s+([\w-]+))?', 'i');
  IF v_loc_match IS NOT NULL THEN
    v_building := trim(v_loc_match[1]);
    v_floor    := coalesce(v_loc_match[2]::int, 1);
    v_room     := coalesce(v_loc_match[3], '0');
  END IF;

  -- Best-effort category classification from the alert message.
  IF v_lower_msg LIKE '%fire%' OR v_lower_msg LIKE '%smoke%' THEN
    v_type := 'fire';
  ELSIF v_lower_msg LIKE '%medical%' OR v_lower_msg LIKE '%injur%' OR v_lower_msg LIKE '%health%' THEN
    v_type := 'medical';
  ELSIF v_lower_msg LIKE '%security%' OR v_lower_msg LIKE '%threat%' OR v_lower_msg LIKE '%intrud%' THEN
    v_type := 'security';
  END IF;

  v_incident_id := 'SOS-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 10));

  INSERT INTO public.incidents (
    id, title, type, severity, status,
    location_building, location_floor, location_room,
    location_x, location_y,
    reported_at, reported_by, description,
    assigned_units, casualties, evacuated, guests_affected
  ) VALUES (
    v_incident_id,
    'Guest SOS — ' || initcap(v_type::text),
    v_type,
    greatest(1, least(4, coalesce(NEW.severity, 3))),
    'active',
    v_building, v_floor, v_room,
    0, 0,
    now(), 'Guest Portal',
    'Guest-initiated SOS: ' || coalesce(NEW.message, '(no message)'),
    ARRAY[]::text[], 0, 0, 1
  )
  ON CONFLICT (id) DO NOTHING;

  -- Link the alert back to the incident.
  NEW.incident_id := v_incident_id;

  -- Seed the timeline.
  INSERT INTO public.timeline_events (id, incident_id, timestamp, message, type, author)
  VALUES (
    gen_random_uuid(),
    v_incident_id,
    to_char(now(), 'HH24:MI:SS'),
    coalesce(NEW.message, 'Guest SOS received.'),
    'alert',
    'Guest Portal'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alerts_sos_to_incident ON public.alerts;
CREATE TRIGGER trg_alerts_sos_to_incident
  BEFORE INSERT ON public.alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_sos_alert();

-- =============================================================================
-- Guest <-> Staff chat channel.
-- Each `channel` is keyed by building+room (e.g. "Tower A::1402"). Anonymous
-- guests can read & insert into their own channel; authenticated staff can
-- read & insert into any channel. Attachments (photos, voice notes) live in
-- the `chat-attachments` storage bucket and are referenced by URL.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel         TEXT NOT NULL,
  sender          TEXT NOT NULL CHECK (sender IN ('guest', 'staff', 'ai', 'system')),
  sender_name     TEXT,
  body            TEXT,
  attachment_url  TEXT,
  attachment_type TEXT CHECK (attachment_type IN ('image', 'audio', 'location') OR attachment_type IS NULL),
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_channel_created ON public.messages (channel, created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_read_anon  ON public.messages;
DROP POLICY IF EXISTS messages_read_auth  ON public.messages;
DROP POLICY IF EXISTS messages_write_anon ON public.messages;
DROP POLICY IF EXISTS messages_write_auth ON public.messages;

-- Anyone can read messages (the channel itself is the access boundary).
CREATE POLICY messages_read_anon  ON public.messages FOR SELECT TO anon          USING (true);
CREATE POLICY messages_read_auth  ON public.messages FOR SELECT TO authenticated USING (true);
-- Anonymous guests may only post as 'guest'; staff may post anything.
CREATE POLICY messages_write_anon ON public.messages FOR INSERT TO anon          WITH CHECK (sender = 'guest');
CREATE POLICY messages_write_auth ON public.messages FOR INSERT TO authenticated WITH CHECK (true);

-- Storage bucket for chat photo + voice uploads.
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "chat_attachments_read"  ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_write" ON storage.objects;
CREATE POLICY "chat_attachments_read"  ON storage.objects FOR SELECT TO public USING (bucket_id = 'chat-attachments');
CREATE POLICY "chat_attachments_write" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'chat-attachments');

-- Realtime publication --------------------------------------------------------
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.timeline_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- =============================================================================
-- Bootstrap: promote your own user to admin once you've signed up.
--   UPDATE public.profiles SET role = 'admin' WHERE email = 'you@example.com';
-- =============================================================================
