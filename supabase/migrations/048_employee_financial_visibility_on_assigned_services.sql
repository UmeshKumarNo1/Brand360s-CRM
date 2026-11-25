-- Migration: 048_employee_financial_visibility_on_assigned_services.sql
-- Description: Allow employees to view invoices, invoice_items, payments, and invoice_payment_allocations
-- for clients that they own (assigned_salesperson / created_by) OR where they are assigned to at least one service.
-- This ensures that financial totals (Contract, Invoiced, Collected, Outstanding, Payment Status)
-- are identical and accurate between Admin view and Employee My Clients / My Assigned Services views.

-- 1. Helper function public.has_assigned_service_for_client(client_id, user_id) is already created in migration 046 as SECURITY DEFINER STABLE.

-- 2. INVOICES SELECT Policy:
DROP POLICY IF EXISTS "Employees view own client invoices" ON public.invoices;
DROP POLICY IF EXISTS "Employees view own or assigned service client invoices" ON public.invoices;

CREATE POLICY "Employees view own or assigned service client invoices"
ON public.invoices FOR SELECT TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = invoices.client_id 
    AND (
      clients.assigned_salesperson = auth.uid() OR 
      clients.created_by = auth.uid() OR
      public.has_assigned_service_for_client(clients.id, auth.uid())
    )
  )
);

-- 3. INVOICE ITEMS SELECT Policy:
DROP POLICY IF EXISTS "Employees view and insert own client invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Employees view and insert own or assigned service invoice items" ON public.invoice_items;

CREATE POLICY "Employees view and insert own or assigned service invoice items"
ON public.invoice_items FOR ALL TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.invoices 
    JOIN public.clients ON clients.id = invoices.client_id
    WHERE invoices.id = invoice_items.invoice_id 
    AND (
      clients.assigned_salesperson = auth.uid() OR 
      clients.created_by = auth.uid() OR
      public.has_assigned_service_for_client(clients.id, auth.uid())
    )
  )
);

-- 4. PAYMENTS SELECT Policy:
DROP POLICY IF EXISTS "Employees view own client payments" ON public.payments;
DROP POLICY IF EXISTS "Employees view own or assigned service client payments" ON public.payments;

CREATE POLICY "Employees view own or assigned service client payments"
ON public.payments FOR SELECT TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = payments.client_id 
    AND (
      clients.assigned_salesperson = auth.uid() OR 
      clients.created_by = auth.uid() OR
      public.has_assigned_service_for_client(clients.id, auth.uid())
    )
  )
);

-- 5. INVOICE PAYMENT ALLOCATIONS SELECT Policy:
DROP POLICY IF EXISTS "Employees view relevant allocations" ON public.invoice_payment_allocations;
DROP POLICY IF EXISTS "Employees view relevant allocations for client services" ON public.invoice_payment_allocations;

CREATE POLICY "Employees view relevant allocations for client services"
ON public.invoice_payment_allocations FOR SELECT TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.invoices 
    JOIN public.clients ON clients.id = invoices.client_id
    WHERE invoices.id = invoice_payment_allocations.invoice_id
    AND (
      clients.assigned_salesperson = auth.uid() OR 
      clients.created_by = auth.uid() OR
      public.has_assigned_service_for_client(clients.id, auth.uid())
    )
  )
);
