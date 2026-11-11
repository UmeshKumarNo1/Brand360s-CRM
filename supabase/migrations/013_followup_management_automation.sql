-- ==============================================================================
-- BRAND 360s CRM — Migration 013: Follow-Up Management & Task Automation
-- ==============================================================================

-- 1. Extend public.follow_ups with Feature 014 fields (idempotent)
ALTER TABLE public.follow_ups
  ADD COLUMN IF NOT EXISTS due_time TIME,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completion_notes TEXT,
  ADD COLUMN IF NOT EXISTS reminder_setting TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS contact_person TEXT,
  ADD COLUMN IF NOT EXISTS contact_method TEXT DEFAULT 'Phone',
  ADD COLUMN IF NOT EXISTS related_service_id UUID REFERENCES public.client_services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Performance indexes for dashboard & tabs
CREATE INDEX IF NOT EXISTS idx_follow_ups_completed_at ON public.follow_ups(completed_at);
CREATE INDEX IF NOT EXISTS idx_follow_ups_due_date_status ON public.follow_ups(due_date, status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_created_by ON public.follow_ups(created_by);

-- 3. Row Level Security for Feature 014
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

-- Admins: Full CRUD access
DROP POLICY IF EXISTS "Admins full access to follow-ups" ON public.follow_ups;
CREATE POLICY "Admins full access to follow-ups"
ON public.follow_ups FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Salespersons / Employees:
-- Select: Can view follow-ups assigned to them OR follow-ups of clients they are authorized to manage
DROP POLICY IF EXISTS "Employees view authorized follow-ups" ON public.follow_ups;
CREATE POLICY "Employees view authorized follow-ups"
ON public.follow_ups FOR SELECT TO authenticated
USING (
  assigned_to = auth.uid() OR
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = follow_ups.client_id
      AND (c.assigned_salesperson = auth.uid() OR c.created_by = auth.uid())
  )
);

-- Insert: Can create follow-ups for clients they own/assigned, assigned to themselves
DROP POLICY IF EXISTS "Employees create authorized follow-ups" ON public.follow_ups;
CREATE POLICY "Employees create authorized follow-ups"
ON public.follow_ups FOR INSERT TO authenticated
WITH CHECK (
  assigned_to = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = follow_ups.client_id
      AND (c.assigned_salesperson = auth.uid() OR c.created_by = auth.uid())
      AND c.client_status != 'Archived'
  )
);

-- Update: Can update follow-ups assigned to them (cannot reassign to others)
DROP POLICY IF EXISTS "Employees update own follow-ups" ON public.follow_ups;
CREATE POLICY "Employees update own follow-ups"
ON public.follow_ups FOR UPDATE TO authenticated
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());

-- Delete: Employees can only delete their own pending follow-ups (completed/in-progress require Admin)
DROP POLICY IF EXISTS "Employees delete own pending follow-ups" ON public.follow_ups;
CREATE POLICY "Employees delete own pending follow-ups"
ON public.follow_ups FOR DELETE TO authenticated
USING (assigned_to = auth.uid() AND status = 'Pending');

