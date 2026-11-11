-- ==============================================================================
-- BRAND 360s CRM — Migration 010: Payment Reconciliation & Installment Management
-- ==============================================================================

-- 1. Extend payment_schedules with invoice linking and cancel reason
ALTER TABLE public.payment_schedules
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_schedules_invoice ON public.payment_schedules(invoice_id);

-- 2. Create installment_payment_allocations to record detailed allocation history
CREATE TABLE IF NOT EXISTS public.installment_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_id UUID NOT NULL REFERENCES public.payment_schedules(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  invoice_allocation_id UUID REFERENCES public.invoice_payment_allocations(id) ON DELETE SET NULL,
  allocated_amount NUMERIC(12, 2) NOT NULL CHECK (allocated_amount > 0),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inst_alloc_installment ON public.installment_payment_allocations(installment_id);
CREATE INDEX IF NOT EXISTS idx_inst_alloc_payment ON public.installment_payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_inst_alloc_inv_alloc ON public.installment_payment_allocations(invoice_allocation_id);

-- 3. Row Level Security for installment_payment_allocations
ALTER TABLE public.installment_payment_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on installment allocations"
ON public.installment_payment_allocations FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Employees view relevant installment allocations"
ON public.installment_payment_allocations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.payment_schedules 
    JOIN public.clients ON clients.id = payment_schedules.client_id
    WHERE payment_schedules.id = installment_payment_allocations.installment_id
    AND (clients.assigned_salesperson = auth.uid() OR clients.created_by = auth.uid() OR public.is_admin())
  )
);

-- 4. Function: recalculate installment amount_paid and status
CREATE OR REPLACE FUNCTION public.recalculate_installment_status(p_installment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inst RECORD;
  v_total_paid NUMERIC(12, 2);
  v_today DATE := CURRENT_DATE;
  v_new_status TEXT;
  v_paid_date DATE;
BEGIN
  SELECT * INTO v_inst FROM public.payment_schedules WHERE id = p_installment_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_inst.status = 'Cancelled' THEN
    RETURN;
  END IF;

  -- Sum from allocations
  SELECT COALESCE(SUM(allocated_amount), 0)
  INTO v_total_paid
  FROM public.installment_payment_allocations
  WHERE installment_id = p_installment_id;

  IF v_total_paid >= v_inst.amount THEN
    v_new_status := 'Paid in full';
    SELECT payment_date INTO v_paid_date
    FROM public.installment_payment_allocations ipa
    JOIN public.payments p ON p.id = ipa.payment_id
    WHERE ipa.installment_id = p_installment_id
    ORDER BY p.payment_date DESC
    LIMIT 1;
    IF v_paid_date IS NULL THEN
      v_paid_date := v_today;
    END IF;
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'Partially Paid';
    v_paid_date := NULL;
  ELSIF v_inst.due_date < v_today THEN
    v_new_status := 'Overdue';
    v_paid_date := NULL;
  ELSIF v_inst.due_date = v_today THEN
    v_new_status := 'Due';
  ELSE
    v_new_status := 'Upcoming';
  END IF;

  UPDATE public.payment_schedules
  SET 
    amount_paid = v_total_paid,
    status = v_new_status,
    paid_date = v_paid_date,
    updated_at = NOW()
  WHERE id = p_installment_id;
END;
$$;

-- 5. Comprehensive Atomic RPC to Allocate Payment to Invoice AND Installments
CREATE OR REPLACE FUNCTION public.reconcile_and_allocate_payment(
  p_payment_id UUID,
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_installment_ids UUID[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_payment RECORD;
  v_invoice RECORD;
  v_client RECORD;
  v_allocated_total NUMERIC(12, 2);
  v_payment_available NUMERIC(12, 2);
  v_new_invoice_paid NUMERIC(12, 2);
  v_new_invoice_balance NUMERIC(12, 2);
  v_new_invoice_status TEXT;
  v_inv_alloc_id UUID;
  v_today DATE := CURRENT_DATE;

  -- Installment allocation variables
  v_inst RECORD;
  v_amount_to_allocate NUMERIC(12, 2);
  v_inst_remaining NUMERIC(12, 2);
  v_inst_take NUMERIC(12, 2);
  v_inst_alloc_id UUID;
  v_total_inst_allocated NUMERIC(12, 2) := 0;
BEGIN
  -- 1. Identify user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  -- 2. Validate amount
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Allocation amount must be greater than zero.');
  END IF;

  -- 3. Check admin role
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = v_user_id AND role = 'admin' AND is_active = true
  ) INTO v_is_admin;

  -- 4. Lock & fetch payment
  SELECT * INTO v_payment 
  FROM public.payments 
  WHERE id = p_payment_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment transaction not found.');
  END IF;

  IF v_payment.status NOT IN ('Verified', 'Pending Verification') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only verified or valid payments can be reconciled.');
  END IF;

  -- 5. Lock & fetch invoice
  SELECT * INTO v_invoice 
  FROM public.invoices 
  WHERE id = p_invoice_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found.');
  END IF;

  IF v_invoice.status = 'Cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot allocate payment to a cancelled invoice.');
  END IF;

  -- 6. Ensure payment and invoice belong to the exact same client
  IF v_payment.client_id <> v_invoice.client_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment and invoice must belong to the same client.');
  END IF;

  -- 7. Authorization check: Non-admins can only allocate for their assigned/created clients
  IF NOT v_is_admin THEN
    SELECT * INTO v_client 
    FROM public.clients 
    WHERE id = v_payment.client_id;

    IF NOT FOUND OR (v_client.assigned_salesperson <> v_user_id AND v_client.created_by <> v_user_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'You are not authorized to reconcile payments for this client.');
    END IF;
  END IF;

  -- 8. Calculate total amount already allocated from this payment
  SELECT COALESCE(SUM(allocated_amount), 0) INTO v_allocated_total
  FROM public.invoice_payment_allocations
  WHERE payment_id = p_payment_id;

  v_payment_available := v_payment.amount - v_allocated_total;

  IF p_amount > (v_payment_available + 0.001) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Allocation amount exceeds available unallocated payment balance (Available: ₹' || v_payment_available || ').'
    );
  END IF;

  -- 9. Check invoice balance
  IF p_amount > (v_invoice.balance_due + 0.001) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Allocation amount exceeds invoice outstanding balance (Balance: ₹' || v_invoice.balance_due || ').'
    );
  END IF;

  -- 10. Record allocation in invoice_payment_allocations
  INSERT INTO public.invoice_payment_allocations (
    invoice_id,
    payment_id,
    allocated_amount
  ) VALUES (
    p_invoice_id,
    p_payment_id,
    p_amount
  ) RETURNING id INTO v_inv_alloc_id;

  -- 11. Recalculate invoice paid amount from all its allocations
  SELECT COALESCE(SUM(allocated_amount), 0) INTO v_new_invoice_paid
  FROM public.invoice_payment_allocations
  WHERE invoice_id = p_invoice_id;

  v_new_invoice_balance := GREATEST(0, v_invoice.total_amount - v_new_invoice_paid);

  -- 12. Determine new invoice status
  IF v_new_invoice_balance <= 0 THEN
    v_new_invoice_status := 'Paid';
  ELSIF v_new_invoice_paid > 0 THEN
    IF v_invoice.due_date < v_today THEN
      v_new_invoice_status := 'Overdue';
    ELSE
      v_new_invoice_status := 'Partially Paid';
    END IF;
  ELSE
    IF v_invoice.due_date < v_today THEN
      v_new_invoice_status := 'Overdue';
    ELSE
      v_new_invoice_status := 'Issued';
    END IF;
  END IF;

  -- 13. Update invoice table
  UPDATE public.invoices
  SET 
    amount_paid = v_new_invoice_paid,
    balance_due = v_new_invoice_balance,
    status = v_new_invoice_status,
    updated_at = NOW()
  WHERE id = p_invoice_id;

  -- 14. Distribute allocation to client installments
  -- Priority:
  -- A: Installments explicitly linked to this invoice or passed in p_installment_ids
  -- B: Unpaid/partially-paid installments of the client ordered by due_date ASC
  v_amount_to_allocate := p_amount;

  FOR v_inst IN
    SELECT *
    FROM public.payment_schedules
    WHERE client_id = v_payment.client_id
      AND status <> 'Cancelled'
      AND (amount - amount_paid) > 0
      AND (
        (p_installment_ids IS NOT NULL AND id = ANY(p_installment_ids))
        OR (p_installment_ids IS NULL AND (invoice_id = p_invoice_id OR invoice_id IS NULL))
      )
    ORDER BY 
      CASE WHEN invoice_id = p_invoice_id THEN 0 ELSE 1 END,
      due_date ASC,
      installment_number ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_amount_to_allocate <= 0;

    v_inst_remaining := v_inst.amount - v_inst.amount_paid;
    IF v_inst_remaining > 0 THEN
      v_inst_take := LEAST(v_amount_to_allocate, v_inst_remaining);

      -- Record installment payment allocation
      INSERT INTO public.installment_payment_allocations (
        installment_id,
        payment_id,
        invoice_allocation_id,
        allocated_amount
      ) VALUES (
        v_inst.id,
        p_payment_id,
        v_inv_alloc_id,
        v_inst_take
      ) RETURNING id INTO v_inst_alloc_id;

      -- Link invoice to installment if not already set
      IF v_inst.invoice_id IS NULL THEN
        UPDATE public.payment_schedules
        SET invoice_id = p_invoice_id
        WHERE id = v_inst.id;
      END IF;

      -- Recalculate status of this installment
      PERFORM public.recalculate_installment_status(v_inst.id);

      v_amount_to_allocate := v_amount_to_allocate - v_inst_take;
      v_total_inst_allocated := v_total_inst_allocated + v_inst_take;
    END IF;
  END LOOP;

  -- 15. Trigger client financials sync trigger if needed
  UPDATE public.clients
  SET updated_at = NOW()
  WHERE id = v_payment.client_id;

  RETURN jsonb_build_object(
    'success', true,
    'invoice_allocation_id', v_inv_alloc_id,
    'allocated_amount', p_amount,
    'invoice_paid', v_new_invoice_paid,
    'invoice_balance', v_new_invoice_balance,
    'invoice_status', v_new_invoice_status,
    'installment_allocated_amount', v_total_inst_allocated
  );
END;
$$;

