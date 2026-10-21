-- Migration: 20261009000000_multi_tenant_schema_and_backfill.sql
-- Description: Multi-tenant database schema, safe backfill for existing friend's data, and RESTRICT foreign keys.

-- Step 1: Create Tenants Table
CREATE TABLE IF NOT EXISTS public.tenants (
  id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name VARCHAR(100) NOT NULL,
  owner_name VARCHAR(100) NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  license_price NUMERIC(10, 2) NOT NULL DEFAULT 5000.00,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('PAID', 'PENDING')),
  account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (account_status IN ('ACTIVE', 'SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 2: Seed Primary Tenant for Existing Production Data
INSERT INTO public.tenants (id, name, owner_name, username, password_hash, license_price, payment_status, account_status)
VALUES (
  't-original',
  'Original Game Zone',
  'Original Owner',
  'originalgame',
  'pbkdf2$sha256$10000$disabled_change_me$',
  5000.00,
  'PAID',
  'ACTIVE'
)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Add tenant_id Columns (Nullable initially for safe backfill)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100);
ALTER TABLE public.consoles ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100);
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100);
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100);
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100);
ALTER TABLE public.adjustments ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100);

-- Step 4: Backfill All Unassigned Records to Primary Tenant 't-original'
UPDATE public.users SET tenant_id = 't-original' WHERE tenant_id IS NULL;
UPDATE public.consoles SET tenant_id = 't-original' WHERE tenant_id IS NULL;
UPDATE public.settings SET tenant_id = 't-original' WHERE tenant_id IS NULL;
UPDATE public.sessions SET tenant_id = 't-original' WHERE tenant_id IS NULL;
UPDATE public.matches SET tenant_id = 't-original' WHERE tenant_id IS NULL;
UPDATE public.payments SET tenant_id = 't-original' WHERE tenant_id IS NULL;
UPDATE public.adjustments SET tenant_id = 't-original' WHERE tenant_id IS NULL;

-- Step 5: Add ON DELETE RESTRICT Foreign Keys (Protects financial records and history from deletion)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS fk_users_tenant;
ALTER TABLE public.users ADD CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.consoles DROP CONSTRAINT IF EXISTS fk_consoles_tenant;
ALTER TABLE public.consoles ADD CONSTRAINT fk_consoles_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS fk_settings_tenant;
ALTER TABLE public.settings ADD CONSTRAINT fk_settings_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS fk_sessions_tenant;
ALTER TABLE public.sessions ADD CONSTRAINT fk_sessions_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS fk_matches_tenant;
ALTER TABLE public.matches ADD CONSTRAINT fk_matches_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS fk_payments_tenant;
ALTER TABLE public.payments ADD CONSTRAINT fk_payments_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.adjustments DROP CONSTRAINT IF EXISTS fk_adjustments_tenant;
ALTER TABLE public.adjustments ADD CONSTRAINT fk_adjustments_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

-- Step 6: Apply NOT NULL Constraints & Per-Tenant Unique Constraints
ALTER TABLE public.users ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.consoles ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.settings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.sessions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.matches ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.payments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.adjustments ALTER COLUMN tenant_id SET NOT NULL;

-- Console name unique per tenant
ALTER TABLE public.consoles DROP CONSTRAINT IF EXISTS consoles_name_key;
ALTER TABLE public.consoles DROP CONSTRAINT IF EXISTS consoles_tenant_name_key;
ALTER TABLE public.consoles ADD CONSTRAINT consoles_tenant_name_key UNIQUE (tenant_id, name);

-- Step 7: Enable Row Level Security & Enforce Policies
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consoles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adjustments ENABLE ROW LEVEL SECURITY;

-- Consoles tenant policy
CREATE POLICY "Consoles tenant isolation select" ON public.consoles FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true) OR current_setting('app.current_tenant_id', true) IS NULL);
CREATE POLICY "Consoles tenant isolation insert" ON public.consoles FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true) OR current_setting('app.current_tenant_id', true) IS NULL);
CREATE POLICY "Consoles tenant isolation update" ON public.consoles FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id', true) OR current_setting('app.current_tenant_id', true) IS NULL);

-- Sessions tenant policy
CREATE POLICY "Sessions tenant isolation select" ON public.sessions FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true) OR current_setting('app.current_tenant_id', true) IS NULL);
CREATE POLICY "Sessions tenant isolation insert" ON public.sessions FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true) OR current_setting('app.current_tenant_id', true) IS NULL);
CREATE POLICY "Sessions tenant isolation update" ON public.sessions FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id', true) OR current_setting('app.current_tenant_id', true) IS NULL);

-- Matches tenant policy
CREATE POLICY "Matches tenant isolation select" ON public.matches FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true) OR current_setting('app.current_tenant_id', true) IS NULL);
CREATE POLICY "Matches tenant isolation insert" ON public.matches FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true) OR current_setting('app.current_tenant_id', true) IS NULL);

-- Payments tenant policy
CREATE POLICY "Payments tenant isolation select" ON public.payments FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true) OR current_setting('app.current_tenant_id', true) IS NULL);
CREATE POLICY "Payments tenant isolation insert" ON public.payments FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true) OR current_setting('app.current_tenant_id', true) IS NULL);
