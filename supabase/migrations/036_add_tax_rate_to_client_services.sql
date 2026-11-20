-- Migration 036: Add tax_rate NUMERIC column to client_services with safe default 0
-- Preserves existing pricing and historical financial records without altering historical values

ALTER TABLE public.client_services
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) DEFAULT 0.00;

-- Ensure any existing rows where tax_rate is NULL default safely to 0.00
UPDATE public.client_services
SET tax_rate = 0.00
WHERE tax_rate IS NULL;
