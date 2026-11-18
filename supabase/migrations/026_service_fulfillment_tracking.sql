-- Migration: 026_service_fulfillment_tracking.sql
-- Description: Add fulfillment stages and stage tracking columns to client_services

ALTER TABLE public.client_services
  ADD COLUMN IF NOT EXISTS fulfillment_stages JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS current_stage_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS current_stage_description TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;

-- Optional comment explaining fulfillment_stages schema:
-- [
--   { "name": "Onboarding", "status": "completed" },
--   { "name": "Doc Collection", "status": "completed" },
--   { "name": "Preparation", "status": "current" },
--   { "name": "Filing", "status": "upcoming" },
--   { "name": "Completed", "status": "upcoming" }
-- ]

