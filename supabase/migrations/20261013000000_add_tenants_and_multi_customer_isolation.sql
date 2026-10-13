-- ==============================================================================
-- Migration: Add Tenants Table, Tenant ID Columns & RLS Isolation Policies
-- Description: Supports multi-customer accounts for Ghost Game Center licensing (5,000 ETB/license)
-- Date: 2026-10-13
-- ==============================================================================

-- 1. CREATE TENANTS TABLE IF NOT EXISTS
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  game_zone_name TEXT NOT NULL,
  owner_contact_name TEXT,
  username TEXT NOT NULL UNIQUE,
  license_amount NUMERIC NOT NULL DEFAULT 5000,
  license_status TEXT NOT NULL DEFAULT 'PAID',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast username lookup during customer login
CREATE INDEX IF NOT EXISTS idx_tenants_username ON tenants(username);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- 2. INSERT DEFAULT TENANT FOR EXISTING DATA
INSERT INTO tenants (id, game_zone_name, owner_contact_name, username, license_amount, license_status, status)
VALUES ('t-default', 'Main Game Zone', 'Ghostvon Owner', 'ghostvon', 5000, 'PAID', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Also ensure ghostvon username exists in tenants
INSERT INTO tenants (id, game_zone_name, owner_contact_name, username, license_amount, license_status, status)
VALUES ('t-ghostvon', 'Ghostvon Main Center', 'Ghostvon Owner', 'ghostvon_admin', 5000, 'PAID', 'ACTIVE')
ON CONFLICT (username) DO NOTHING;

-- 3. ADD TENANT_ID TO ALL CORE OPERATIONAL TABLES
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) DEFAULT 't-default';
ALTER TABLE consoles ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) DEFAULT 't-default';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) DEFAULT 't-default';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) DEFAULT 't-default';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) DEFAULT 't-default';
ALTER TABLE adjustments ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) DEFAULT 't-default';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) DEFAULT 't-default';

-- Backfill NULL tenant_id columns to 't-default' so existing data remains preserved
UPDATE users SET tenant_id = 't-default' WHERE tenant_id IS NULL;
UPDATE consoles SET tenant_id = 't-default' WHERE tenant_id IS NULL;
UPDATE sessions SET tenant_id = 't-default' WHERE tenant_id IS NULL;
UPDATE matches SET tenant_id = 't-default' WHERE tenant_id IS NULL;
UPDATE payments SET tenant_id = 't-default' WHERE tenant_id IS NULL;
UPDATE adjustments SET tenant_id = 't-default' WHERE tenant_id IS NULL;
UPDATE settings SET tenant_id = 't-default' WHERE tenant_id IS NULL;

-- 4. CREATE INDEXES FOR MULTI-TENANT QUERY OPTIMIZATION
CREATE INDEX IF NOT EXISTS idx_consoles_tenant_id ON consoles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_id ON sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_matches_tenant_id ON matches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_tenant_id ON adjustments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_settings_tenant_id ON settings(tenant_id);

-- 5. ENABLE ROW LEVEL SECURITY (RLS) & POLICIES
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE consoles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow full access for anon/service_role API requests (Application controls authentication & session cookies)
CREATE POLICY "Allow all access to tenants for app service" ON tenants FOR ALL USING (true);
CREATE POLICY "Allow all access to users for app service" ON users FOR ALL USING (true);
CREATE POLICY "Allow all access to consoles for app service" ON consoles FOR ALL USING (true);
CREATE POLICY "Allow all access to sessions for app service" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow all access to matches for app service" ON matches FOR ALL USING (true);
CREATE POLICY "Allow all access to payments for app service" ON payments FOR ALL USING (true);
CREATE POLICY "Allow all access to adjustments for app service" ON adjustments FOR ALL USING (true);
CREATE POLICY "Allow all access to settings for app service" ON settings FOR ALL USING (true);
