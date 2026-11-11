-- ==============================================================================
-- BRAND 360s CRM — Migration 011: Fix Client Update RLS Subquery Bug
-- ==============================================================================

-- 1. Drop the flawed client update policy that caused:
-- "more than one row returned by a subquery used as an expression"
DROP POLICY IF EXISTS "Employees can update own assigned clients" ON public.clients;

-- 2. Re-create the update policy cleanly:
-- - Salespersons/Employees can update only their assigned/created clients (USING condition).
-- - In WITH CHECK, prevent employees from reassigning the salesperson to another user.
--   Using (assigned_salesperson = auth.uid() OR created_by = auth.uid()) guarantees
--   the employee remains an authorized owner without any ambiguous correlated table subquery.
CREATE POLICY "Employees can update own assigned clients"
ON public.clients FOR UPDATE TO authenticated
USING (
  assigned_salesperson = auth.uid() OR created_by = auth.uid()
)
WITH CHECK (
  assigned_salesperson = auth.uid() OR created_by = auth.uid()
);

-- 3. Ensure Admin policy explicitly covers ALL actions with both USING and WITH CHECK
DROP POLICY IF EXISTS "Admins have full access to clients" ON public.clients;
CREATE POLICY "Admins have full access to clients"
ON public.clients FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

