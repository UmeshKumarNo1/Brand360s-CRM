-- Migration: 046_employee_client_visibility_by_service_assignment.sql
-- Description: Allow employees to view clients where they are the assigned salesperson OR where they are assigned to at least one service.
-- Preserves client ownership (assigned_salesperson) and prevents RLS recursion using a SECURITY DEFINER helper.

-- 1. Create a non-recursive SECURITY DEFINER helper function to check if a user is assigned to any service of a client
CREATE OR REPLACE FUNCTION public.has_assigned_service_for_client(p_client_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_client_id IS NULL OR p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 
    FROM public.client_services 
    WHERE client_id = p_client_id 
      AND assigned_employee_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Drop existing SELECT policies on public.clients
DROP POLICY IF EXISTS "Employees can view own assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Employees view own assigned clients or service assignments" ON public.clients;

-- 3. Create updated SELECT policy on public.clients:
-- An authenticated user can select a client if:
--   - The user is an administrator (public.is_admin())
--   - The user is the client's assigned salesperson (assigned_salesperson = auth.uid())
--   - The user created the client record (created_by = auth.uid())
--   - The user is assigned to at least one service for that client (public.has_assigned_service_for_client(id, auth.uid()))
CREATE POLICY "Employees view own assigned clients or service assignments"
ON public.clients FOR SELECT TO authenticated
USING (
  public.is_admin() OR
  assigned_salesperson = auth.uid() OR
  created_by = auth.uid() OR
  public.has_assigned_service_for_client(id, auth.uid())
);

-- 4. Create an index to ensure fast lookups on (client_id, assigned_employee_id)
CREATE INDEX IF NOT EXISTS idx_client_services_client_employee ON public.client_services(client_id, assigned_employee_id);
