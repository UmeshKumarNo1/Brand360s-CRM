-- Migration: 040_invoice_based_payment_limits.sql
-- Description: Updates payment limit enforcement and synchronization to use eligible issued invoice balances (including GST)
-- rather than contract value (which excludes GST and does not represent actual billed receivable).
--
-- Single Source of Truth for Payments:
-- - Maximum Permitted Payment = SUM(balance_due of eligible issued invoices)
-- - Previously Received = SUM(verified non-reversed payments allocated to those invoices)
-- - Excludes: Draft, Cancelled, Void invoices, and Reversed payments.

-- 1. Update public.record_client_payment RPC to validate against remaining invoice receivable instead of contract value
CREATE OR REPLACE FUNCTION public.record_client_payment(
  p_client_id UUID,
  p_amount NUMERIC,
  p_payment_date DATE,
  p_payment_method TEXT,
  p_transaction_ref TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'Verified',
  p_installment_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN := false;
  v_client RECORD;
  v_total_invoice_receivable NUMERIC := 0;
  v_valid_received NUMERIC := 0;
  v_remaining_receivable NUMERIC := 0;
  v_payment_id UUID;
  v_payment_status TEXT;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Authenticate user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required to record payments.');
  END IF;

  -- Validate amount
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment amount must be greater than zero.');
  END IF;

  -- Check admin authorization
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = v_user_id AND role = 'admin' AND is_active = true
  ) INTO v_is_admin;

  -- Lock client row to ensure serializable balance calculation and prevent concurrent overpayments
  SELECT * INTO v_client
  FROM public.clients
  WHERE id = p_client_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Client record not found.');
  END IF;

  -- Check user permissions (admin or assigned salesperson or creator)
  IF NOT v_is_admin AND v_client.assigned_salesperson <> v_user_id AND v_client.created_by <> v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not authorized to record payments for this client.');
  END IF;

  -- Calculate remaining outstanding invoice balance from valid issued invoices (excluding Draft, Void, Cancelled)
  SELECT COALESCE(SUM(
    CASE 
      WHEN balance_due IS NOT NULL THEN balance_due 
      ELSE GREATEST(0, total_amount - COALESCE(amount_paid, 0)) 
    END
  ), 0)
  INTO v_remaining_receivable
  FROM public.invoices
  WHERE client_id = p_client_id
    AND status NOT IN ('Draft', 'Void', 'Cancelled');

  -- STRICT VALIDATION: If status is Verified, payment cannot exceed the remaining outstanding invoice balance
  v_payment_status := COALESCE(p_status, 'Verified');

  IF v_payment_status = 'Verified' AND (p_amount > (v_remaining_receivable + 0.009)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment amount (₹' || p_amount || ') exceeds the total remaining invoice balance (₹' || v_remaining_receivable || '). Maximum permitted payment: ₹' || v_remaining_receivable || '. Please ensure an invoice has been generated for any additional contract scope before recording payment.'
    );
  END IF;

  -- Insert payment record
  INSERT INTO public.payments (
    client_id,
    amount,
    payment_date,
    payment_method,
    transaction_ref,
    status,
    notes,
    recorded_by,
    verified_by
  ) VALUES (
    p_client_id,
    p_amount,
    p_payment_date,
    p_payment_method,
    p_transaction_ref,
    v_payment_status,
    p_notes,
    v_user_id,
    CASE WHEN v_payment_status = 'Verified' THEN v_user_id ELSE NULL END
  ) RETURNING id INTO v_payment_id;

  -- If installment milestone specified, update installment schedule
  IF p_installment_id IS NOT NULL AND v_payment_status = 'Verified' THEN
    UPDATE public.payment_schedules
    SET 
      amount_paid = LEAST(amount, amount_paid + p_amount),
      status = CASE 
        WHEN (amount_paid + p_amount) >= amount THEN 'Paid in full'
        WHEN (amount_paid + p_amount) > 0 THEN CASE WHEN due_date < v_today THEN 'Overdue' ELSE 'Partially Paid' END
        WHEN due_date < v_today THEN 'Overdue'
        ELSE 'Pending'
      END,
      paid_date = CASE WHEN (amount_paid + p_amount) >= amount THEN p_payment_date ELSE paid_date END,
      updated_at = NOW()
    WHERE id = p_installment_id AND client_id = p_client_id;
  END IF;

  -- Trigger client financial recalculation
  PERFORM public.sync_client_contract_value(p_client_id);

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'amount', p_amount,
    'remaining_balance', GREATEST(0, v_remaining_receivable - p_amount)
  );
END;
$$;

-- 2. Update sync_client_financials trigger function to use invoice-based outstanding
CREATE OR REPLACE FUNCTION public.sync_client_financials()
RETURNS TRIGGER AS $$
DECLARE
  target_client_id UUID;
  total_contract NUMERIC(12, 2);
  total_paid NUMERIC(12, 2);
  remaining_invoice_balance NUMERIC(12, 2);
  next_installment RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_client_id := OLD.client_id;
  ELSE
    target_client_id := NEW.client_id;
  END IF;

  IF target_client_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- 1. Sum verified, non-reversed payments only
  SELECT COALESCE(SUM(amount), 0)
  INTO total_paid
  FROM public.payments
  WHERE client_id = target_client_id AND status = 'Verified';

  -- 2. Get contract value from services (active, non-cancelled)
  SELECT COALESCE(SUM(COALESCE(total_amount, service_fee + govt_fee, 0.00)), 0.00)
  INTO total_contract
  FROM public.client_services
  WHERE client_id = target_client_id AND service_status <> 'Cancelled';

  -- 3. Calculate remaining outstanding invoice balance (Issued invoices only)
  SELECT COALESCE(SUM(
    CASE 
      WHEN balance_due IS NOT NULL THEN balance_due 
      ELSE GREATEST(0, total_amount - COALESCE(amount_paid, 0)) 
    END
  ), 0)
  INTO remaining_invoice_balance
  FROM public.invoices
  WHERE client_id = target_client_id AND status NOT IN ('Draft', 'Void', 'Cancelled');

  -- 4. Find earliest unpaid or partially paid installment
  SELECT amount - amount_paid AS due_amount, due_date
  INTO next_installment
  FROM public.payment_schedules
  WHERE client_id = target_client_id 
    AND status IN ('Pending', 'Partially Paid', 'Overdue')
  ORDER BY due_date ASC
  LIMIT 1;

  -- 5. Update the clients table
  UPDATE public.clients
  SET 
    contract_value = total_contract,
    payments_received = total_paid,
    balance_receivable = remaining_invoice_balance,
    next_payment_due_amount = COALESCE(next_installment.due_amount, remaining_invoice_balance),
    next_payment_due_date = next_installment.due_date,
    payment_status = CASE 
      WHEN total_contract > 0 AND remaining_invoice_balance = 0 AND total_paid > 0 THEN 'Paid in full'
      WHEN next_installment.due_date IS NOT NULL AND next_installment.due_date < CURRENT_DATE THEN 'Overdue'
      WHEN total_paid > 0 THEN 'Partially Paid'
      ELSE 'Upcoming'
    END,
    updated_at = TIMEZONE('utc', NOW())
  WHERE id = target_client_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update sync_client_contract_value to calculate balance_receivable using invoices
CREATE OR REPLACE FUNCTION public.sync_client_contract_value(p_client_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_contract NUMERIC(12, 2) := 0.00;
  v_payments_received NUMERIC(12, 2) := 0.00;
  v_balance_receivable NUMERIC(12, 2) := 0.00;
  v_service_count INT := 0;
  v_next_due RECORD;
  v_current_status TEXT;
BEGIN
  IF p_client_id IS NULL THEN
    RETURN;
  END IF;

  -- Calculate sum of active services (exclude Cancelled)
  SELECT 
    COALESCE(SUM(COALESCE(total_amount, service_fee + govt_fee, 0.00)), 0.00),
    COUNT(*)
  INTO v_total_contract, v_service_count
  FROM public.client_services
  WHERE client_id = p_client_id
    AND service_status <> 'Cancelled';

  -- Get total verified payments received for the client
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_payments_received
  FROM public.payments
  WHERE client_id = p_client_id 
    AND status = 'Verified';

  -- Calculate remaining balance from issued, non-cancelled invoices
  SELECT COALESCE(SUM(
    CASE 
      WHEN balance_due IS NOT NULL THEN balance_due 
      ELSE GREATEST(0, total_amount - COALESCE(amount_paid, 0)) 
    END
  ), 0.00)
  INTO v_balance_receivable
  FROM public.invoices
  WHERE client_id = p_client_id
    AND status NOT IN ('Draft', 'Void', 'Cancelled');

  -- Get earliest unpaid or partially paid installment
  SELECT amount - amount_paid AS due_amount, due_date
  INTO v_next_due
  FROM public.payment_schedules
  WHERE client_id = p_client_id 
    AND status IN ('Pending', 'Partially Paid', 'Overdue')
  ORDER BY due_date ASC
  LIMIT 1;

  -- Determine payment status
  v_current_status := CASE
    WHEN v_total_contract > 0 AND v_balance_receivable = 0 AND v_payments_received > 0 THEN 'Paid in full'
    WHEN v_next_due.due_date IS NOT NULL AND v_next_due.due_date < CURRENT_DATE THEN 'Overdue'
    WHEN v_payments_received > 0 THEN 'Partially Paid'
    ELSE 'Upcoming'
  END;

  -- Update client record
  UPDATE public.clients
  SET
    contract_value = v_total_contract,
    payments_received = v_payments_received,
    balance_receivable = v_balance_receivable,
    next_payment_due_amount = COALESCE(v_next_due.due_amount, v_balance_receivable),
    next_payment_due_date = v_next_due.due_date,
    payment_status = v_current_status,
    updated_at = TIMEZONE('utc', NOW())
  WHERE id = p_client_id;
END;
$$;
