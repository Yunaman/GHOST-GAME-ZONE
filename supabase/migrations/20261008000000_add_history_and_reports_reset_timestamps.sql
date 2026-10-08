-- Ghost Game Zone Supabase Migration
-- Adds timestamp baseline columns for Clear History and Reset Reports

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS history_cleared_at TIMESTAMPTZ;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS reports_reset_at TIMESTAMPTZ;
