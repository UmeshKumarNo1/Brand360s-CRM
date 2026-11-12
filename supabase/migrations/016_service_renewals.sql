-- ==============================================================================
-- BRAND 360s CRM — Migration 016: Service Renewals Support
-- ==============================================================================

-- 1. Safely add renewal fields to client_services if they do not exist
ALTER TABLE public.client_services
  ADD COLUMN IF NOT EXISTS renewal_date DATE,
  ADD COLUMN IF NOT EXISTS renewal_amount NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS renewal_status TEXT DEFAULT 'Upcoming' 
    CHECK (renewal_status IN ('Upcoming', 'Due Soon', 'Overdue', 'Renewed', 'Expired')),
  ADD COLUMN IF NOT EXISTS last_renewed_at TIMESTAMPTZ;

-- 2. Create indexes for quick renewals query lookups
CREATE INDEX IF NOT EXISTS idx_client_services_renewal_date ON public.client_services(renewal_date);
CREATE INDEX IF NOT EXISTS idx_client_services_renewal_status ON public.client_services(renewal_status);

-- 3. Backfill renewal_date where expected_completion_date exists (defaulting to 1 year later or expected completion)
UPDATE public.client_services
SET 
  renewal_date = COALESCE(expected_completion_date, (start_date + INTERVAL '1 year')::DATE, (created_at + INTERVAL '1 year')::DATE),
  renewal_amount = COALESCE(total_amount, service_fee, 0.00),
  renewal_status = 'Upcoming'
WHERE renewal_date IS NULL;

-- 4. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
