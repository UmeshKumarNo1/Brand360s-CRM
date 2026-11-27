-- Migration: 055_add_discount_approval_workflow.sql
-- Description: Add discount request, approval, and audit tracking columns to public.client_services.

ALTER TABLE public.client_services
  ADD COLUMN IF NOT EXISTS discount_requested_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_approved_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_reason TEXT,
  ADD COLUMN IF NOT EXISTS discount_status TEXT NOT NULL DEFAULT 'Not Requested'
    CHECK (discount_status IN ('Not Requested', 'Pending Approval', 'Approved', 'Rejected')),
  ADD COLUMN IF NOT EXISTS discount_requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS discount_approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS discount_approval_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_client_services_discount_status
  ON public.client_services(discount_status);

