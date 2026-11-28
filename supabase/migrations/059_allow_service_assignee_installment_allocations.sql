-- Migration 059: RLS policies for installment_payment_allocations

ALTER TABLE public.installment_payment_allocations
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view installment allocations"
ON public.installment_payment_allocations;

CREATE POLICY "Staff can view installment allocations"
ON public.installment_payment_allocations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.payment_schedules ps
    JOIN public.clients c ON c.id = ps.client_id
    WHERE ps.id = installment_payment_allocations.installment_id
      AND (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'Admin'
            AND COALESCE(p.is_active, true) = true
        )
        OR c.assigned_salesperson = auth.uid()
        OR c.created_by = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.client_services cs
          WHERE cs.id = ps.client_service_id
            AND cs.client_id = c.id
            AND cs.assigned_employee_id = auth.uid()
        )
      )
  )
);

DROP POLICY IF EXISTS "Staff can insert installment allocations"
ON public.installment_payment_allocations;

CREATE POLICY "Staff can insert installment allocations"
ON public.installment_payment_allocations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.payment_schedules ps
    JOIN public.clients c ON c.id = ps.client_id
    WHERE ps.id = installment_payment_allocations.installment_id
      AND (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'Admin'
            AND COALESCE(p.is_active, true) = true
        )
        OR c.assigned_salesperson = auth.uid()
        OR c.created_by = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.client_services cs
          WHERE cs.id = ps.client_service_id
            AND cs.client_id = c.id
            AND cs.assigned_employee_id = auth.uid()
        )
      )
  )
);

NOTIFY pgrst, 'reload schema';
