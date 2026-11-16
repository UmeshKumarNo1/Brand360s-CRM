-- ==============================================================================
-- BRAND 360s CRM — Migration 021: Payment Edit, Correction & Reversal System (Feature 014)
-- ==============================================================================

-- 1. Extend payments status check constraint to support 'Reversed'
-- Currently status has check: status IN ('Pending Verification', 'Verified', 'Rejected', 'Refunded')
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check 
  CHECK (status IN ('Pending Verification', 'Verified', 'Rejected', 'Refunded', 'Reversed'));

-- Add updated_at and updated_by columns to payments if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'reversal_reason'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN reversal_reason TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'reversed_at'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN reversed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'reversed_by'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN reversed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Update sync_client_financials trigger function to handle 'Reversed' payments appropriately
-- Verified payments count towards total_paid; Reversed payments must NOT count towards total_paid
CREATE OR REPLACE FUNCTION public.sync_client_financials()
RETURNS TRIGGER AS $$
DECLARE
  target_client_id UUID;
  total_contract NUMERIC(12, 2);
  total_paid NUMERIC(12, 2);
  remaining_balance NUMERIC(12, 2);
  next_installment RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_client_id := OLD.client_id;
  ELSE
    target_client_id := NEW.client_id;
  END IF;

  -- 1. Sum verified payments only (excluding Reversed, Rejected, Refunded)
  SELECT COALESCE(SUM(amount), 0)
  INTO total_paid
  FROM public.payments
  WHERE client_id = target_client_id AND status = 'Verified';

  -- 2. Get contract value
  SELECT contract_value
  INTO total_contract
  FROM public.clients
  WHERE id = target_client_id;

  remaining_balance := GREATEST(0, COALESCE(total_contract, 0) - total_paid);

  -- 3. Find earliest unpaid or partially paid installment
  SELECT amount - amount_paid AS due_amount, due_date
  INTO next_installment
  FROM public.payment_schedules
  WHERE client_id = target_client_id 
    AND status IN ('Pending', 'Partially Paid', 'Overdue')
  ORDER BY due_date ASC
  LIMIT 1;

  -- 4. Update the clients table
  UPDATE public.clients
  SET 
    payments_received = total_paid,
    balance_receivable = remaining_balance,
    next_payment_due_amount = COALESCE(next_installment.due_amount, remaining_balance),
    next_payment_due_date = next_installment.due_date,
    payment_status = CASE 
      WHEN total_contract > 0 AND remaining_balance = 0 THEN 'Paid in full'
      WHEN next_installment.due_date IS NOT NULL AND next_installment.due_date < CURRENT_DATE THEN 'Overdue'
      WHEN total_paid > 0 THEN 'Partially Paid'
      ELSE 'Upcoming'
    END,
    updated_at = TIMEZONE('utc', NOW())
  WHERE id = target_client_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atomic RPC: edit_unallocated_or_partial_payment
-- Supports editing payment fields and amount (provided amount >= already allocated amount)
CREATE OR REPLACE FUNCTION public.edit_payment_transaction(
  p_payment_id UUID,
  p_amount NUMERIC,
  p_payment_date DATE,
  p_payment_method TEXT,
  p_transaction_ref TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
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
  v_client RECORD;
  v_allocated_total NUMERIC(12, 2) := 0;
  v_valid_methods TEXT[] := ARRAY['Bank Transfer / NEFT', 'UPI / QR', 'Credit Card', 'Debit Card', 'Cheque', 'Cash', 'Other'];
BEGIN
  -- 1. Identify user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  -- 2. Validate inputs
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment amount must be greater than zero.');
  END IF;

  IF p_payment_date IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment date is required.');
  END IF;

  IF p_payment_method IS NULL OR NOT (p_payment_method = ANY(v_valid_methods)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid payment method.');
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

  IF v_payment.status = 'Reversed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot edit a reversed payment.');
  END IF;

  -- 5. Permission check: Admin or assigned salesperson
  IF NOT v_is_admin THEN
    SELECT * INTO v_client
    FROM public.clients
    WHERE id = v_payment.client_id;

    IF NOT FOUND OR (v_client.assigned_salesperson <> v_user_id AND v_client.created_by <> v_user_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized to modify this payment.');
    END IF;
  END IF;

  -- 6. Check total already allocated
  SELECT COALESCE(SUM(allocated_amount), 0) INTO v_allocated_total
  FROM public.invoice_payment_allocations
  WHERE payment_id = p_payment_id;

  -- Amount cannot be reduced below already allocated amount
  IF p_amount < (v_allocated_total - 0.001) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Payment amount cannot be reduced below the already allocated amount of ₹' || v_allocated_total || '.'
    );
  END IF;

  -- 7. Update payment record (preserves ID, created_at, recorded_by)
  UPDATE public.payments
  SET
    amount = p_amount,
    payment_date = p_payment_date,
    payment_method = p_payment_method,
    transaction_ref = NULLIF(TRIM(p_transaction_ref), ''),
    notes = NULLIF(TRIM(p_notes), ''),
    updated_at = TIMEZONE('utc', NOW()),
    updated_by = v_user_id
  WHERE id = p_payment_id;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'new_amount', p_amount,
    'allocated_amount', v_allocated_total,
    'available_amount', (p_amount - v_allocated_total)
  );
END;
$$;

-- 4. Atomic RPC: reverse_payment_transaction
-- Safely voids/reverses a payment, un-allocates from invoices, restores balances,
-- reverses linked installment allocations, and marks payment status = 'Reversed'
CREATE OR REPLACE FUNCTION public.reverse_payment_transaction(
  p_payment_id UUID,
  p_reason TEXT
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
  v_client RECORD;
  v_alloc RECORD;
  v_inv RECORD;
  v_inst_alloc RECORD;
  v_reversed_allocations INTEGER := 0;
  v_total_unallocated NUMERIC(12, 2) := 0;
  v_new_invoice_paid NUMERIC(12, 2);
  v_new_invoice_balance NUMERIC(12, 2);
  v_new_invoice_status TEXT;
  v_new_inst_paid NUMERIC(12, 2);
  v_new_inst_status TEXT;
  v_inst RECORD;
BEGIN
  -- 1. Identify user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  -- 2. Validate reason
  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'A clear reversal reason is required.');
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

  IF v_payment.status = 'Reversed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This payment has already been reversed.');
  END IF;

  -- 5. Permission check
  IF NOT v_is_admin THEN
    SELECT * INTO v_client
    FROM public.clients
    WHERE id = v_payment.client_id;

    IF NOT FOUND OR (v_client.assigned_salesperson <> v_user_id AND v_client.created_by <> v_user_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized to reverse payments for this client.');
    END IF;
  END IF;

  -- 6. Loop through all invoice allocations and revert them
  FOR v_alloc IN 
    SELECT * FROM public.invoice_payment_allocations 
    WHERE payment_id = p_payment_id 
    FOR UPDATE
  LOOP
    -- Lock and fetch invoice
    SELECT * INTO v_inv 
    FROM public.invoices 
    WHERE id = v_alloc.invoice_id 
    FOR UPDATE;

    IF FOUND THEN
      v_new_invoice_paid := GREATEST(0, COALESCE(v_inv.amount_paid, 0) - v_alloc.allocated_amount);
      v_new_invoice_balance := LEAST(v_inv.total_amount, GREATEST(0, v_inv.total_amount - v_new_invoice_paid));

      v_new_invoice_status := CASE 
        WHEN v_new_invoice_balance = 0 AND v_inv.total_amount > 0 THEN 'Paid'
        WHEN v_new_invoice_paid > 0 THEN 'Partially Paid'
        WHEN v_inv.due_date < CURRENT_DATE THEN 'Overdue'
        ELSE 'Unpaid'
      END;

      UPDATE public.invoices
      SET
        amount_paid = v_new_invoice_paid,
        balance_due = v_new_invoice_balance,
        status = v_new_invoice_status,
        updated_at = TIMEZONE('utc', NOW())
      WHERE id = v_inv.id;
    END IF;

    v_total_unallocated := v_total_unallocated + v_alloc.allocated_amount;
    v_reversed_allocations := v_reversed_allocations + 1;
  END LOOP;

  -- 7. Revert linked installment allocations if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'installment_payment_allocations') THEN
    FOR v_inst_alloc IN
      SELECT * FROM public.installment_payment_allocations
      WHERE payment_id = p_payment_id
      FOR UPDATE
    LOOP
      SELECT * INTO v_inst
      FROM public.payment_schedules
      WHERE id = v_inst_alloc.installment_id
      FOR UPDATE;

      IF FOUND THEN
        v_new_inst_paid := GREATEST(0, COALESCE(v_inst.amount_paid, 0) - v_inst_alloc.allocated_amount);
        v_new_inst_status := CASE
          WHEN v_new_inst_paid >= v_inst.amount THEN 'Paid in full'
          WHEN v_new_inst_paid > 0 THEN 'Partially Paid'
          WHEN v_inst.due_date < CURRENT_DATE THEN 'Overdue'
          ELSE 'Pending'
        END;

        UPDATE public.payment_schedules
        SET
          amount_paid = v_new_inst_paid,
          status = v_new_inst_status,
          paid_date = CASE WHEN v_new_inst_status = 'Paid in full' THEN v_inst.paid_date ELSE NULL END,
          updated_at = TIMEZONE('utc', NOW())
        WHERE id = v_inst.id;
      END IF;
    END LOOP;

    -- Delete installment allocations for this payment
    DELETE FROM public.installment_payment_allocations WHERE payment_id = p_payment_id;
  END IF;

  -- Delete invoice allocations for this payment
  DELETE FROM public.invoice_payment_allocations WHERE payment_id = p_payment_id;

  -- 8. Mark payment as Reversed (preserves the original record and audit trail)
  UPDATE public.payments
  SET
    status = 'Reversed',
    reversal_reason = TRIM(p_reason),
    reversed_at = TIMEZONE('utc', NOW()),
    reversed_by = v_user_id,
    updated_at = TIMEZONE('utc', NOW()),
    updated_by = v_user_id
  WHERE id = p_payment_id;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'reversed_allocations_count', v_reversed_allocations,
    'total_unallocated_amount', v_total_unallocated,
    'status', 'Reversed'
  );
END;
$$;

