-- Enable standard extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define custom enum types based on our TypeScript definitions
CREATE TYPE incident_type AS ENUM ('fire', 'medical', 'security', 'hazmat', 'weather', 'other');
CREATE TYPE incident_status AS ENUM ('active', 'responding', 'contained', 'resolved');
CREATE TYPE timeline_event_type AS ENUM ('alert', 'dispatch', 'update', 'escalation', 'resolution');
CREATE TYPE alert_type AS ENUM ('sos', 'sensor', 'staff', 'system');
CREATE TYPE staff_role AS ENUM ('security', 'maintenance', 'medical', 'management', 'housekeeping', 'engineering');
CREATE TYPE staff_status AS ENUM ('available', 'deployed', 'en-route', 'off-duty', 'break');
CREATE TYPE guest_status AS ENUM ('in-room', 'common-area', 'evacuated', 'missing', 'checked-out');

-- Create Incidents Table
CREATE TABLE public.incidents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type incident_type NOT NULL,
    severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 4),
    status incident_status NOT NULL,
    location_building TEXT NOT NULL,
    location_floor INTEGER NOT NULL,
    location_room TEXT NOT NULL,
    location_x FLOAT NOT NULL,
    location_y FLOAT NOT NULL,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reported_by TEXT NOT NULL,
    description TEXT NOT NULL,
    assigned_units TEXT[] DEFAULT '{}',
    casualties INTEGER DEFAULT 0,
    evacuated INTEGER DEFAULT 0,
    guests_affected INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Timeline Events Table (Cascade delete if incident is removed)
CREATE TABLE public.timeline_events (
    id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
    timestamp TEXT NOT NULL,
    message TEXT NOT NULL,
    type timeline_event_type NOT NULL,
    author TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Staff Table
CREATE TABLE public.staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role staff_role NOT NULL,
    unit TEXT NOT NULL,
    status staff_status NOT NULL,
    location_building TEXT NOT NULL,
    location_floor INTEGER NOT NULL,
    location_x FLOAT NOT NULL,
    location_y FLOAT NOT NULL,
    phone TEXT,
    avatar TEXT,
    current_incident TEXT REFERENCES public.incidents(id) ON DELETE SET NULL,
    eta TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Guests Table
CREATE TABLE public.guests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    room TEXT NOT NULL,
    building TEXT NOT NULL,
    floor INTEGER NOT NULL,
    check_in TEXT,
    check_out TEXT,
    status guest_status NOT NULL,
    accessibility TEXT[] DEFAULT '{}',
    language TEXT NOT NULL,
    vip BOOLEAN DEFAULT FALSE,
    last_seen TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Alerts Table
CREATE TABLE public.alerts (
    id TEXT PRIMARY KEY,
    type alert_type NOT NULL,
    severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 4),
    message TEXT NOT NULL,
    location TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    incident_id TEXT REFERENCES public.incidents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated and anonymous users
CREATE POLICY "Enable read access for all" ON public.incidents FOR SELECT USING (true);
CREATE POLICY "Enable read access for all" ON public.timeline_events FOR SELECT USING (true);
CREATE POLICY "Enable read access for all" ON public.staff FOR SELECT USING (true);
CREATE POLICY "Enable read access for all" ON public.guests FOR SELECT USING (true);
CREATE POLICY "Enable read access for all" ON public.alerts FOR SELECT USING (true);

-- Allow write access to authenticated users
CREATE POLICY "Enable insert for authenticated users only" ON public.incidents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON public.incidents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users only" ON public.incidents FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.timeline_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.staff FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON public.staff FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.guests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON public.guests FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.alerts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON public.alerts FOR UPDATE TO authenticated USING (true);

-- Allow anonymous users to create SOS alerts
CREATE POLICY "Enable insert for anon SOS" ON public.alerts FOR INSERT TO anon WITH CHECK (type = 'sos');

-- Realtime Setup
-- Enable Realtime for specific tables so the frontend can subscribe
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table public.incidents;
alter publication supabase_realtime add table public.timeline_events;
alter publication supabase_realtime add table public.alerts;
alter publication supabase_realtime add table public.staff;
alter publication supabase_realtime add table public.guests;
