-- Migration: 051_allow_service_assignee_allocations_insert.sql
-- Description: Allow active Admins, client owners (assigned_salesperson / created_by),
-- and employees assigned to at least one service on the client (has_assigned_service_for_client)
-- to INSERT into invoice_payment_allocations.

DROP POLICY IF EXISTS "Employees insert own client allocations" ON public.invoice_payment_allocations;
DROP POLICY IF EXISTS "Authorized users insert invoice payment allocations" ON public.invoice_payment_allocations;

CREATE POLICY "Authorized users insert invoice payment allocations"
ON public.invoice_payment_allocations FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.is_active = true
  )
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.invoices
      JOIN public.clients ON clients.id = invoices.client_id
      WHERE invoices.id = invoice_payment_allocations.invoice_id
        AND (
          clients.assigned_salesperson = auth.uid()
          OR clients.created_by = auth.uid()
          OR public.has_assigned_service_for_client(clients.id, auth.uid())
        )
    )
  )
);

