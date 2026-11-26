-- Migration: 050_allow_service_assignee_payments_insert.sql
-- Description: Allow active Admins, client owners (assigned_salesperson / created_by),
-- and employees assigned to at least one service on the client (has_assigned_service_for_client)
-- to INSERT payments when recorded_by = auth.uid().

DROP POLICY IF EXISTS "Employees insert own client payments" ON public.payments;
DROP POLICY IF EXISTS "Authorized users insert client payments" ON public.payments;

CREATE POLICY "Authorized users insert client payments"
ON public.payments FOR INSERT TO authenticated
WITH CHECK (
  (recorded_by IS NULL OR recorded_by = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.is_active = true
  )
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = payments.client_id
        AND (
          clients.assigned_salesperson = auth.uid()
          OR clients.created_by = auth.uid()
          OR public.has_assigned_service_for_client(clients.id, auth.uid())
        )
    )
  )
);

