-- Migration: 053_add_prospect_conversion_link.sql
-- Description: Track converted_client_id on public.follow_ups (prospects)
-- to link converted prospects to their new CRM client and prevent duplicate conversions.

ALTER TABLE public.follow_ups
ADD COLUMN IF NOT EXISTS converted_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_follow_ups_converted_client_id ON public.follow_ups(converted_client_id);

