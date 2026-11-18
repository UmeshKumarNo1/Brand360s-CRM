-- Migration: 025_enforce_contract_payment_limits.sql
-- Description: Strictly enforce client contract value limits on payments at database and trigger levels.
-- Prevents recorded payments from exceeding client remaining contract balance.

-- 1. Atomic RPC: record_client_payment
-- Validates that the new payment does not exceed the client's remaining contract value:
--   remaining_balance = GREATEST(0, contract_value - valid_payments_received)
-- Locks the client record FOR UPDATE to prevent race conditions / concurrent overpayments.

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
  v_valid_received NUMERIC := 0;
  v_remaining_contract NUMERIC := 0;
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

  -- Calculate sum of verified, non-reversed payments currently on record
  SELECT COALESCE(SUM(amount), 0)
  INTO v_valid_received
  FROM public.payments
  WHERE client_id = p_client_id
    AND status = 'Verified';

  -- Calculate remaining contract balance
  v_remaining_contract := GREATEST(0, COALESCE(v_client.contract_value, 0) - v_valid_received);

  -- STRICT VALIDATION: If status is Verified, the payment cannot exceed remaining contract balance
  v_payment_status := COALESCE(p_status, 'Verified');

  IF v_payment_status = 'Verified' AND (p_amount > (v_remaining_contract + 0.009)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment amount (₹' || p_amount || ') exceeds the remaining contract balance (₹' || v_remaining_contract || '). Maximum permitted payment: ₹' || v_remaining_contract || '. Please update the contract value or add the additional service before recording this payment.'
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

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'amount', p_amount,
    'remaining_balance', GREATEST(0, v_remaining_contract - p_amount)
  );
END;
$$;

-- 2. Enhanced Trigger: sync_client_financials
-- Accurately syncs client financial summary whenever payments or schedules change.
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

  IF target_client_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- 1. Sum verified, non-reversed payments only
  SELECT COALESCE(SUM(amount), 0)
  INTO total_paid
  FROM public.payments
  WHERE client_id = target_client_id AND status = 'Verified';

  -- 2. Get contract value
  SELECT COALESCE(contract_value, 0)
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

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

