-- ==============================================================================
-- BRAND 360s CRM — Migration 012: Audit Logs & Safe Admin Delete System
-- ==============================================================================

-- 1. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- e.g. 'DELETE', 'ARCHIVE', 'VOID', 'UPDATE'
  entity_type TEXT NOT NULL, -- e.g. 'client', 'employee', 'vendor', 'follow_up', 'client_service', 'payment', 'invoice'
  entity_id TEXT NOT NULL,
  entity_name TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Enable RLS for Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read all audit logs; system/authenticated can insert
CREATE POLICY "Admins full access to audit logs"
ON public.audit_logs FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 2. Ensure RLS on vendors and client_services allows Admin DELETE while restricting salespersons
DROP POLICY IF EXISTS "Admins full management on vendors" ON public.vendors;
CREATE POLICY "Admins full management on vendors"
ON public.vendors FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins full access to client services" ON public.client_services;
CREATE POLICY "Admins full access to client services"
ON public.client_services FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Ensure follow_ups DELETE policy is strict: Admin can delete any, user can only delete own pending followups
DROP POLICY IF EXISTS "Admins full access to follow-ups" ON public.follow_ups;
CREATE POLICY "Admins full access to follow-ups"
ON public.follow_ups FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Employees delete own pending follow-ups" ON public.follow_ups;
CREATE POLICY "Employees delete own pending follow-ups"
ON public.follow_ups FOR DELETE TO authenticated
USING (assigned_to = auth.uid() AND status = 'Pending');

