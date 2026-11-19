-- Migration: 030_service_fulfillment_stage_management.sql
-- Description: Interactive Fulfillment Stage Management with Audit History and RLS

-- 1. Ensure client_services has fulfillment tracking columns
ALTER TABLE public.client_services
  ADD COLUMN IF NOT EXISTS fulfillment_stages JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS current_stage_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS current_stage_description TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;

-- 2. Create service_stage_history table
CREATE TABLE IF NOT EXISTS public.service_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  client_service_id UUID NOT NULL REFERENCES public.client_services(id) ON DELETE CASCADE,
  previous_stage TEXT,
  new_stage TEXT NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'ADVANCE', -- 'ADVANCE', 'REVERT', 'NOTE', 'COMPLETE'
  notes TEXT,
  progress_percentage INTEGER,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stage_history_client_id ON public.service_stage_history(client_id);
CREATE INDEX IF NOT EXISTS idx_stage_history_service_id ON public.service_stage_history(client_service_id);
CREATE INDEX IF NOT EXISTS idx_stage_history_created_at ON public.service_stage_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.service_stage_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "stage_history_read" ON public.service_stage_history;
DROP POLICY IF EXISTS "stage_history_insert" ON public.service_stage_history;

-- Policy 1: Read permissions
-- Admin/CEO can read all.
-- Salesperson/Assigned employee can read stage history for their assigned clients or services.
CREATE POLICY "stage_history_read" ON public.service_stage_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.client_services cs
      LEFT JOIN public.clients c ON c.id = cs.client_id
      WHERE cs.id = service_stage_history.client_service_id
        AND (
          cs.assigned_employee_id = auth.uid()
          OR c.assigned_salesperson = auth.uid()
          OR c.created_by = auth.uid()
        )
    )
  );

-- Policy 2: Insert permissions
CREATE POLICY "stage_history_insert" ON public.service_stage_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.client_services cs
      LEFT JOIN public.clients c ON c.id = cs.client_id
      WHERE cs.id = service_stage_history.client_service_id
        AND (
          cs.assigned_employee_id = auth.uid()
          OR c.assigned_salesperson = auth.uid()
          OR c.created_by = auth.uid()
        )
    )
  );

