-- ==============================================================================
-- BRAND 360s CRM — Migration 044: Automatic Renewable Service Management
-- ==============================================================================

-- 1. Extend services_catalog with renewal configuration fields
ALTER TABLE public.services_catalog
  ADD COLUMN IF NOT EXISTS is_renewable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS renewal_frequency TEXT DEFAULT 'Annually' 
    CHECK (renewal_frequency IS NULL OR renewal_frequency IN ('Monthly', 'Quarterly', 'Half-Yearly', 'Annually', 'Custom')),
  ADD COLUMN IF NOT EXISTS renewal_duration_months INTEGER DEFAULT 12 
    CHECK (renewal_duration_months IS NULL OR renewal_duration_months > 0),
  ADD COLUMN IF NOT EXISTS default_renewal_amount NUMERIC(12, 2) DEFAULT 0.00 
    CHECK (default_renewal_amount IS NULL OR default_renewal_amount >= 0),
  ADD COLUMN IF NOT EXISTS default_reminder_days INTEGER DEFAULT 30 
    CHECK (default_reminder_days IS NULL OR default_reminder_days >= 0);

-- 2. Extend client_services with client-specific renewal configuration fields
ALTER TABLE public.client_services
  ADD COLUMN IF NOT EXISTS is_renewable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS renewal_frequency TEXT DEFAULT 'Annually'
    CHECK (renewal_frequency IS NULL OR renewal_frequency IN ('Monthly', 'Quarterly', 'Half-Yearly', 'Annually', 'Custom')),
  ADD COLUMN IF NOT EXISTS renewal_duration_months INTEGER DEFAULT 12
    CHECK (renewal_duration_months IS NULL OR renewal_duration_months > 0),
  ADD COLUMN IF NOT EXISTS renewal_reminder_days INTEGER DEFAULT 30
    CHECK (renewal_reminder_days IS NULL OR renewal_reminder_days >= 0),
  ADD COLUMN IF NOT EXISTS renewal_cycle_count INTEGER NOT NULL DEFAULT 0;

-- 3. Extend renewals table with cycle tracking, reminder dates, and confirmed_by audit info
ALTER TABLE public.renewals
  ADD COLUMN IF NOT EXISTS cycle_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS renewal_frequency TEXT DEFAULT 'Annually',
  ADD COLUMN IF NOT EXISTS duration_months INTEGER DEFAULT 12,
  ADD COLUMN IF NOT EXISTS reminder_date DATE,
  ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- 4. Uniqueness safeguard: Ensure there is only at most ONE active Pending renewal per client service
-- This prevents accidental duplicate pending cycles on retries or edits.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_renewal_per_service
  ON public.renewals (client_service_id)
  WHERE (renewal_status = 'Pending');

-- 5. Additional performance indexes for renewals querying
CREATE INDEX IF NOT EXISTS idx_renewals_cycle_number 
  ON public.renewals(cycle_number);
CREATE INDEX IF NOT EXISTS idx_client_services_is_renewable 
  ON public.client_services(is_renewable);
CREATE INDEX IF NOT EXISTS idx_services_catalog_is_renewable 
  ON public.services_catalog(is_renewable);

-- 6. Seed/Update default renewable offerings in services_catalog
UPDATE public.services_catalog
SET 
  is_renewable = true,
  renewal_frequency = 'Annually',
  renewal_duration_months = 12,
  default_renewal_amount = COALESCE(default_service_fee, 15000.00),
  default_reminder_days = 30
WHERE name ILIKE '%Annual Compliance%'
   OR name ILIKE '%MCA / ROC Compliance%'
   OR name ILIKE '%Accounting & Bookkeeping%'
   OR name ILIKE '%Payroll Management%';

UPDATE public.services_catalog
SET 
  is_renewable = true,
  renewal_frequency = 'Monthly',
  renewal_duration_months = 1,
  default_renewal_amount = COALESCE(default_service_fee, 25000.00),
  default_reminder_days = 7
WHERE name ILIKE '%SEO Retainer%'
   OR name ILIKE '%Social Media Marketing%'
   OR name ILIKE '%Website Maintenance%';

UPDATE public.services_catalog
SET 
  is_renewable = true,
  renewal_frequency = 'Monthly',
  renewal_duration_months = 1,
  default_renewal_amount = COALESCE(default_service_fee, 3000.00),
  default_reminder_days = 7
WHERE name ILIKE '%GST Return Filing%';

-- 7. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
