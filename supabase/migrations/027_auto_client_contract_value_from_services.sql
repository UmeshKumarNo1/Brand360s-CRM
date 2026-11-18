-- Migration: 027_auto_client_contract_value_from_services.sql
-- Description: Automatically compute client Contract Value from active client services.
-- Ensures single source of truth:
--   contract_value = SUM(client_services.total_amount) WHERE service_status <> 'Cancelled'
--   balance_receivable = GREATEST(0, contract_value - payments_received)
-- Protects against manual drift and synchronizes on service INSERT, UPDATE, DELETE.

-- 1. Function to recalculate a specific client's contract value & balance from active services
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

  v_balance_receivable := GREATEST(0.00, v_total_contract - v_payments_received);

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
    WHEN v_total_contract > 0 AND v_balance_receivable = 0 THEN 'Paid in full'
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

-- 2. Trigger function for client_services changes
CREATE OR REPLACE FUNCTION public.trg_sync_client_contract_value_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_client_contract_value(OLD.client_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If client_id changed, sync both
    IF OLD.client_id IS DISTINCT FROM NEW.client_id THEN
      PERFORM public.sync_client_contract_value(OLD.client_id);
      PERFORM public.sync_client_contract_value(NEW.client_id);
    ELSE
      PERFORM public.sync_client_contract_value(NEW.client_id);
    END IF;
    RETURN NEW;
  ELSE
    PERFORM public.sync_client_contract_value(NEW.client_id);
    RETURN NEW;
  END IF;
END;
$$;

-- 3. Attach trigger to client_services
DROP TRIGGER IF EXISTS trg_sync_client_contract_value ON public.client_services;
CREATE TRIGGER trg_sync_client_contract_value
AFTER INSERT OR UPDATE OF total_amount, service_fee, govt_fee, service_status, client_id OR DELETE
ON public.client_services
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_client_contract_value_fn();

-- 4. Admin RPC to reconcile all clients or a specific client
CREATE OR REPLACE FUNCTION public.reconcile_client_contract_values(p_client_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client RECORD;
  v_count INT := 0;
BEGIN
  IF p_client_id IS NOT NULL THEN
    PERFORM public.sync_client_contract_value(p_client_id);
    RETURN jsonb_build_object('success', true, 'reconciled_count', 1);
  END IF;

  FOR v_client IN SELECT id FROM public.clients LOOP
    PERFORM public.sync_client_contract_value(v_client.id);
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'reconciled_count', v_count);
END;
$$;
