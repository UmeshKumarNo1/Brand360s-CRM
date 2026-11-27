-- ==============================================================================
-- BRAND 360s CRM — Migration 047: Leads, Round-Robin Assignment & Client Conversion
-- ==============================================================================

-- 1. Extend public.clients table to support Unconverted Leads & Company Import Details
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS is_lead BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lead_status TEXT DEFAULT 'New',
  ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'Manual',
  ADD COLUMN IF NOT EXISTS entity_id TEXT,
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS roc TEXT,
  ADD COLUMN IF NOT EXISTS nic_code TEXT,
  ADD COLUMN IF NOT EXISTS nic_label TEXT,
  ADD COLUMN IF NOT EXISTS date_of_incorporation DATE,
  ADD COLUMN IF NOT EXISTS paid_up_capital NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS authorized_capital NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS class_of_company TEXT,
  ADD COLUMN IF NOT EXISTS falcon_status TEXT,
  ADD COLUMN IF NOT EXISTS directors JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Update client_status check constraint to support 'Lead'
DO $$
BEGIN
  ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_client_status_check;
  ALTER TABLE public.clients ADD CONSTRAINT clients_client_status_check 
    CHECK (client_status IN ('Active', 'Inactive', 'Pending Onboarding', 'On Hold', 'Archived', 'Lead'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 3. Ensure all pre-existing records are explicitly designated as converted active clients
UPDATE public.clients
SET is_lead = false,
    converted_at = COALESCE(converted_at, created_at)
WHERE is_lead IS NULL OR is_lead = false;

-- 4. Create Indexes for Leads filtering and duplicate checking
CREATE INDEX IF NOT EXISTS idx_clients_is_lead ON public.clients(is_lead);
CREATE INDEX IF NOT EXISTS idx_clients_lead_status ON public.clients(lead_status);
CREATE INDEX IF NOT EXISTS idx_clients_entity_id ON public.clients(entity_id);
CREATE INDEX IF NOT EXISTS idx_clients_import_batch_id ON public.clients(import_batch_id);

-- 5. Create Persistent Round-Robin State Table
-- Tracks continuous sequence of salesperson assignment across imports
CREATE TABLE IF NOT EXISTS public.lead_round_robin_state (
  id INT PRIMARY KEY DEFAULT 1,
  last_assigned_salesperson_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_assigned_index INT NOT NULL DEFAULT -1,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Seed initial sequence row if absent
INSERT INTO public.lead_round_robin_state (id, last_assigned_salesperson_id, last_assigned_index)
VALUES (1, NULL, -1)
ON CONFLICT (id) DO NOTHING;

-- 6. Create Lead Import Batches Table for Import History & Audit Reporting
CREATE TABLE IF NOT EXISTS public.lead_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  total_rows INT NOT NULL DEFAULT 0,
  unique_companies INT NOT NULL DEFAULT 0,
  leads_created INT NOT NULL DEFAULT 0,
  duplicates_skipped INT NOT NULL DEFAULT 0,
  invalid_rows INT NOT NULL DEFAULT 0,
  followups_created INT NOT NULL DEFAULT 0,
  salesperson_distribution JSONB DEFAULT '{}'::jsonb,
  failed_records JSONB DEFAULT '[]'::jsonb,
  imported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_import_batches_created_at ON public.lead_import_batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_import_batches_imported_by ON public.lead_import_batches(imported_by);

-- 7. Comments for documentation
COMMENT ON COLUMN public.clients.is_lead IS 'Flag distinguishing unconverted leads (true) from full clients (false)';
COMMENT ON COLUMN public.clients.entity_id IS 'Unique external Company Registration / CIN identifier from import source';
COMMENT ON COLUMN public.clients.directors IS 'Array of associated company directors [{ name, email, mobile, din, designation }]';
COMMENT ON COLUMN public.clients.converted_at IS 'Timestamp when the lead was manually converted into a client';
COMMENT ON COLUMN public.clients.converted_by IS 'Salesperson or Admin profile ID who executed client conversion';
COMMENT ON TABLE public.lead_round_robin_state IS 'Maintains the continuous round-robin pointer for lead assignments across imports';
COMMENT ON TABLE public.lead_import_batches IS 'Historical logs of bulk Excel/CSV lead imports with execution statistics';
