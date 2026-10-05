-- Ghost Game Zone Supabase Initial Migration Schema

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('OWNER', 'MANAGER', 'STAFF')),
  pin_code VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Consoles Table
CREATE TABLE IF NOT EXISTS public.consoles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'PLAYING', 'FINISHED')),
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  fifa_normal_price NUMERIC(10, 2) NOT NULL DEFAULT 15.00,
  fifa_extra_time_price NUMERIC(10, 2) NOT NULL DEFAULT 5.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'ETB',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  console_id UUID NOT NULL REFERENCES public.consoles(id) ON DELETE RESTRICT,
  game_type VARCHAR(50) NOT NULL DEFAULT 'FIFA',
  billing_type VARCHAR(50) NOT NULL DEFAULT 'MATCH_BASED' CHECK (billing_type IN ('MATCH_BASED', 'TIME_BASED')),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FINISHED', 'CANCELLED')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PAID')),
  created_by VARCHAR(100) DEFAULT 'Staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Matches Table
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  match_number INT NOT NULL,
  base_price NUMERIC(10, 2) NOT NULL DEFAULT 15.00,
  extra_time BOOLEAN NOT NULL DEFAULT FALSE,
  extra_time_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_price NUMERIC(10, 2) NOT NULL DEFAULT 15.00,
  client_idempotency_key VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_session_match_number UNIQUE (session_id, match_number)
);

-- Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  method VARCHAR(20) NOT NULL CHECK (method IN ('CASH', 'TELEBIRR', 'CBE')),
  amount NUMERIC(10, 2) NOT NULL,
  reference VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Adjustments / Audit Table
CREATE TABLE IF NOT EXISTS public.adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  original_amount NUMERIC(10, 2) NOT NULL,
  adjustment_amount NUMERIC(10, 2) NOT NULL,
  resulting_amount NUMERIC(10, 2) NOT NULL,
  reason TEXT NOT NULL,
  created_by VARCHAR(100) DEFAULT 'Manager',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Initial Seed Data
INSERT INTO public.settings (id, fifa_normal_price, fifa_extra_time_price, currency)
VALUES ('default', 15.00, 5.00, 'ETB')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.consoles (name, status, display_order)
VALUES
  ('TV 1', 'AVAILABLE', 1),
  ('TV 2', 'AVAILABLE', 2),
  ('TV 3', 'AVAILABLE', 3)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.users (username, display_name, role, pin_code)
VALUES
  ('owner', 'Owner', 'OWNER', '1234'),
  ('manager', 'Manager', 'MANAGER', '1234'),
  ('staff', 'Staff', 'STAFF', '1234')
ON CONFLICT (username) DO NOTHING;
