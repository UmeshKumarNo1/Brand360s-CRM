-- Migration: 056_add_service_pricing_mode.sql
-- Description: Support 'govt_fee_included' vs 'govt_fee_added' pricing modes on client_services.
-- Existing records default to 'govt_fee_added' to preserve previously saved financial data.

ALTER TABLE public.client_services
  ADD COLUMN IF NOT EXISTS pricing_mode TEXT NOT NULL DEFAULT 'govt_fee_added'
    CHECK (pricing_mode IN ('govt_fee_included', 'govt_fee_added')),
  ADD COLUMN IF NOT EXISTS net_professional_fee NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS govt_fee_gst_exempt BOOLEAN NOT NULL DEFAULT true;

