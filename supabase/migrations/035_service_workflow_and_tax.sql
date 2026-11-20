-- Migration 035: Support custom fulfillment workflow preset & tax rate in client_services
ALTER TABLE public.client_services
  ADD COLUMN IF NOT EXISTS workflow_preset TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) DEFAULT 18.00;

-- Update existing records if workflow_preset is null
UPDATE public.client_services
SET workflow_preset = CASE
  WHEN LOWER(service_name || ' ' || COALESCE(service_category, '')) LIKE '%web%' 
    OR LOWER(service_name || ' ' || COALESCE(service_category, '')) LIKE '%app%'
    OR LOWER(service_name || ' ' || COALESCE(service_category, '')) LIKE '%software%' THEN 'website'
  WHEN LOWER(service_name || ' ' || COALESCE(service_category, '')) LIKE '%gst%' THEN 'gst'
  WHEN LOWER(service_name || ' ' || COALESCE(service_category, '')) LIKE '%trademark%'
    OR LOWER(service_name || ' ' || COALESCE(service_category, '')) LIKE '%patent%' THEN 'trademark'
  WHEN LOWER(service_name || ' ' || COALESCE(service_category, '')) LIKE '%incorporat%'
    OR LOWER(service_name || ' ' || COALESCE(service_category, '')) LIKE '%pvt ltd%'
    OR LOWER(service_name || ' ' || COALESCE(service_category, '')) LIKE '%llp%' THEN 'incorporation'
  WHEN LOWER(service_name || ' ' || COALESCE(service_category, '')) LIKE '%compliance%' THEN 'compliance'
  ELSE 'general'
END
WHERE workflow_preset IS NULL;

