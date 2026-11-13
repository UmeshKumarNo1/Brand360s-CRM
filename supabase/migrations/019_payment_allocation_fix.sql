-- ==============================================================================
-- BRAND 360s CRM — Migration 019: Payment Allocation Fixes & Comprehensive Permissions
-- ==============================================================================

-- 1. Ensure RLS Policy allows Employees to UPDATE Invoices belonging to their assigned/created clients
DROP POLICY IF EXISTS "Employees update own client invoices" ON public.invoices;
CREATE POLICY "Employees update own client invoices"
ON public.invoices FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = invoices.client_id 
    AND (clients.assigned_salesperson = auth.uid() OR clients.created_by = auth.uid() OR public.is_admin())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = invoices.client_id 
    AND (clients.assigned_salesperson = auth.uid() OR clients.created_by = auth.uid() OR public.is_admin())
  )
);

-- 2. Ensure RLS Policy allows Employees to INSERT Allocations for their clients
DROP POLICY IF EXISTS "Employees insert own client allocations" ON public.invoice_payment_allocations;
CREATE POLICY "Employees insert own client allocations"
ON public.invoice_payment_allocations FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices 
    JOIN public.clients ON clients.id = invoices.client_id
    WHERE invoices.id = invoice_payment_allocations.invoice_id
    AND (clients.assigned_salesperson = auth.uid() OR clients.created_by = auth.uid() OR public.is_admin())
  )
);

-- 3. Ensure RLS Policy allows Employees to UPDATE Payments for their clients (for allocation status sync)
DROP POLICY IF EXISTS "Employees update own client payments" ON public.payments;
CREATE POLICY "Employees update own client payments"
ON public.payments FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = payments.client_id 
    AND (clients.assigned_salesperson = auth.uid() OR clients.created_by = auth.uid() OR public.is_admin())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = payments.client_id 
    AND (clients.assigned_salesperson = auth.uid() OR clients.created_by = auth.uid() OR public.is_admin())
  )
);

-- 4. Robust RPC: allocate_payment_to_invoice (with SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.allocate_payment_to_invoice(
  p_payment_id UUID,
  p_invoice_id UUID,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN := false;
  v_payment RECORD;
  v_invoice RECORD;
  v_client RECORD;
  v_allocated_total NUMERIC;
  v_payment_available NUMERIC;
  v_new_invoice_paid NUMERIC;
  v_new_invoice_balance NUMERIC;
  v_new_invoice_status TEXT;
  v_allocation_id UUID;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- 1. Identify authenticated user
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

  -- 4. Lock & fetch payment record
  SELECT * INTO v_payment 
  FROM public.payments 
  WHERE id = p_payment_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment transaction not found.');
  END IF;

  -- Allow Verified or Pending Verification (treat null status gracefully as Verified)
  IF COALESCE(v_payment.status, 'Verified') NOT IN ('Verified', 'Pending Verification') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only verified payments can be allocated.');
  END IF;

  -- 5. Lock & fetch invoice record
  SELECT * INTO v_invoice 
  FROM public.invoices 
  WHERE id = p_invoice_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found.');
  END IF;

  IF LOWER(COALESCE(v_invoice.status, '')) = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot allocate payment to a cancelled invoice.');
  END IF;

  -- 6. Strict client UUID matching
  IF v_payment.client_id <> v_invoice.client_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment and invoice must belong to the exact same client UUID.');
  END IF;

  -- 7. Authorization check: Non-admins can only allocate for their assigned/created clients
  IF NOT v_is_admin THEN
    SELECT * INTO v_client 
    FROM public.clients 
    WHERE id = v_payment.client_id;

    IF NOT FOUND OR (v_client.assigned_salesperson <> v_user_id AND v_client.created_by <> v_user_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'You are not authorized to allocate payments for this client.');
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
  ) RETURNING id INTO v_allocation_id;

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

  RETURN jsonb_build_object(
    'success', true,
    'allocation_id', v_allocation_id,
    'allocated_amount', p_amount,
    'invoice_paid', v_new_invoice_paid,
    'invoice_balance', v_new_invoice_balance,
    'invoice_status', v_new_invoice_status
  );
END;
$$;

-- 5. Robust RPC: reconcile_and_allocate_payment (with SECURITY DEFINER & installment synchronization)
CREATE OR REPLACE FUNCTION public.reconcile_and_allocate_payment(
  p_payment_id UUID,
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_installment_ids UUID[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN := false;
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
  -- 1. Identify authenticated user
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

  IF COALESCE(v_payment.status, 'Verified') NOT IN ('Verified', 'Pending Verification') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only verified payments can be allocated.');
  END IF;

  -- 5. Lock & fetch invoice
  SELECT * INTO v_invoice 
  FROM public.invoices 
  WHERE id = p_invoice_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found.');
  END IF;

  IF LOWER(COALESCE(v_invoice.status, '')) = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot allocate payment to a cancelled invoice.');
  END IF;

  -- 6. Ensure payment and invoice belong to the exact same client
  IF v_payment.client_id <> v_invoice.client_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment and invoice must belong to the exact same client UUID.');
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
      BEGIN
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
      EXCEPTION WHEN OTHERS THEN
        -- If installment_payment_allocations does not exist or fails, keep moving
        NULL;
      END;

      -- Link invoice to installment if not already set
      IF v_inst.invoice_id IS NULL THEN
        UPDATE public.payment_schedules
        SET invoice_id = p_invoice_id
        WHERE id = v_inst.id;
      END IF;

      -- Recalculate status of this installment
      BEGIN
        PERFORM public.recalculate_installment_status(v_inst.id);
      EXCEPTION WHEN OTHERS THEN
        UPDATE public.payment_schedules
        SET 
          amount_paid = amount_paid + v_inst_take,
          status = CASE WHEN (amount_paid + v_inst_take) >= amount THEN 'Paid in full' ELSE 'Partially Paid' END,
          updated_at = NOW()
        WHERE id = v_inst.id;
      END;

      v_amount_to_allocate := v_amount_to_allocate - v_inst_take;
      v_total_inst_allocated := v_total_inst_allocated + v_inst_take;
    END IF;
  END LOOP;

  -- 15. Touch client record to fire financial sync trigger
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

