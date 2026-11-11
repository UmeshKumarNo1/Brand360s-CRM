-- ==============================================================================
-- BRAND 360s CRM — Migration 009: Atomic Payment Allocation RPC
-- ==============================================================================

-- Atomic function to allocate an amount from a payment to an invoice
CREATE OR REPLACE FUNCTION public.allocate_payment_to_invoice(
  p_payment_id UUID,
  p_invoice_id UUID,
  p_amount NUMERIC
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
  v_allocated_total NUMERIC;
  v_payment_available NUMERIC;
  v_new_invoice_paid NUMERIC;
  v_new_invoice_balance NUMERIC;
  v_new_invoice_status TEXT;
  v_allocation_id UUID;
  v_today DATE := CURRENT_DATE;
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
    RETURN jsonb_build_object('success', false, 'error', 'Only verified or valid payments can be allocated.');
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
