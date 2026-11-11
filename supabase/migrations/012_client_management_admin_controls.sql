-- ==============================================================================
-- BRAND 360s CRM — Migration 012: Client Management & Admin Controls
-- ==============================================================================

-- 1. Extend clients table with archiving audit fields if not already present
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_clients_archived_at ON public.clients(archived_at);

-- 2. Create Audit / Client Activity Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- e.g. 'CREATED', 'UPDATED', 'REASSIGNED', 'ARCHIVED', 'RESTORED', 'DELETED'
  entity_type TEXT NOT NULL, -- 'client', 'employee', 'vendor', 'follow_up', 'client_service', 'payment', 'invoice'
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

-- Admins can read all audit logs; employees can read activity logs for assigned clients
DROP POLICY IF EXISTS "Admins full access to audit logs" ON public.audit_logs;
CREATE POLICY "Admins full access to audit logs"
ON public.audit_logs FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Employees view activity of assigned clients" ON public.audit_logs;
CREATE POLICY "Employees view activity of assigned clients"
ON public.audit_logs FOR SELECT TO authenticated
USING (
  entity_type = 'client' AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id::text = audit_logs.entity_id
      AND (c.assigned_salesperson = auth.uid() OR c.created_by = auth.uid())
  )
);

-- 3. Update Client RLS to prevent Salespersons from Archiving, Restoring, or Deleting
-- Salesperson can only update non-archived clients they own and cannot alter client_status to/from 'Archived'
DROP POLICY IF EXISTS "Employees can update own assigned clients" ON public.clients;
CREATE POLICY "Employees can update own assigned clients"
ON public.clients FOR UPDATE TO authenticated
USING (
  (assigned_salesperson = auth.uid() OR created_by = auth.uid())
  AND client_status != 'Archived'
)
WITH CHECK (
  (assigned_salesperson = auth.uid() OR created_by = auth.uid())
  AND client_status != 'Archived'
);

-- Ensure Admins have full access to all clients
DROP POLICY IF EXISTS "Admins have full access to clients" ON public.clients;
CREATE POLICY "Admins have full access to clients"
ON public.clients FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
