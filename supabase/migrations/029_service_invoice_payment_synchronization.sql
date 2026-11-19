-- ==============================================================================
-- BRAND 360s CRM — Migration 029: Service-to-Invoice Payment Traceability & Auto-Sync
-- ==============================================================================

-- 1. Ensure client_service_id exists on invoice_items and invoice_payment_allocations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoice_items' AND column_name = 'client_service_id'
  ) THEN
    ALTER TABLE public.invoice_items 
      ADD COLUMN client_service_id UUID REFERENCES public.client_services(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoice_payment_allocations' AND column_name = 'client_service_id'
  ) THEN
    ALTER TABLE public.invoice_payment_allocations 
      ADD COLUMN client_service_id UUID REFERENCES public.client_services(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoice_payment_allocations' AND column_name = 'invoice_item_id'
  ) THEN
    ALTER TABLE public.invoice_payment_allocations 
      ADD COLUMN invoice_item_id UUID REFERENCES public.invoice_items(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoice_items_client_service_id ON public.invoice_items(client_service_id);
CREATE INDEX IF NOT EXISTS idx_allocations_client_service_id ON public.invoice_payment_allocations(client_service_id);
CREATE INDEX IF NOT EXISTS idx_allocations_invoice_item_id ON public.invoice_payment_allocations(invoice_item_id);

-- 2. Backfill existing allocations where client_service_id is NULL
-- If an invoice has line items linked to a client_service_id, inherit it into the allocation
UPDATE public.invoice_payment_allocations ipa
SET client_service_id = sub.client_service_id
FROM (
  SELECT DISTINCT ON (ii.invoice_id) ii.invoice_id, ii.client_service_id
  FROM public.invoice_items ii
  WHERE ii.client_service_id IS NOT NULL
  ORDER BY ii.invoice_id, ii.id
) sub
WHERE ipa.invoice_id = sub.invoice_id
  AND ipa.client_service_id IS NULL;

-- 3. Enhance allocate_payment_to_invoice to automatically resolve client_service_id
CREATE OR REPLACE FUNCTION public.allocate_payment_to_invoice(
  p_payment_id UUID,
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_invoice_item_id UUID DEFAULT NULL,
  p_client_service_id UUID DEFAULT NULL
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
  v_item RECORD;
  v_client RECORD;
  v_allocated_total NUMERIC;
  v_payment_available NUMERIC;
  v_new_invoice_paid NUMERIC;
  v_new_invoice_balance NUMERIC;
  v_new_invoice_status TEXT;
  v_item_allocated_total NUMERIC;
  v_item_balance NUMERIC;
  v_resolved_service_id UUID := p_client_service_id;
  v_resolved_item_id UUID := p_invoice_item_id;
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

  -- 6. Strict client UUID matching
  IF v_payment.client_id <> v_invoice.client_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment and invoice must belong to the exact same client.');
  END IF;

  -- 7. Authorization check
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

  -- 9. Auto-resolve service from invoice line items if not explicitly provided
  IF v_resolved_service_id IS NULL THEN
    SELECT client_service_id, id INTO v_resolved_service_id, v_resolved_item_id
    FROM public.invoice_items
    WHERE invoice_id = p_invoice_id AND client_service_id IS NOT NULL
    LIMIT 1;
  END IF;

  -- If line item was provided, validate against it
  IF v_resolved_item_id IS NOT NULL THEN
    SELECT * INTO v_item
    FROM public.invoice_items
    WHERE id = v_resolved_item_id AND invoice_id = p_invoice_id;

    IF FOUND THEN
      SELECT COALESCE(SUM(allocated_amount), 0) INTO v_item_allocated_total
      FROM public.invoice_payment_allocations
      WHERE invoice_item_id = v_resolved_item_id;

      v_item_balance := GREATEST(0, v_item.total - v_item_allocated_total);

      IF p_amount > (v_item_balance + 0.001) THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Allocation amount exceeds line item balance (' || v_item.description || ': Outstanding ₹' || v_item_balance || ').'
        );
      END IF;

      IF v_resolved_service_id IS NULL THEN
        v_resolved_service_id := v_item.client_service_id;
      END IF;
    END IF;
  ELSE
    IF p_amount > (v_invoice.balance_due + 0.001) THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Allocation amount exceeds invoice outstanding balance (Balance: ₹' || v_invoice.balance_due || ').'
      );
    END IF;
  END IF;

  -- 10. Record allocation in invoice_payment_allocations
  INSERT INTO public.invoice_payment_allocations (
    invoice_id,
    payment_id,
    invoice_item_id,
    client_service_id,
    allocated_amount
  ) VALUES (
    p_invoice_id,
    p_payment_id,
    v_resolved_item_id,
    v_resolved_service_id,
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

  -- 14. Synchronize payment schedules / installments linked to this invoice
  UPDATE public.payment_schedules
  SET 
    amount_paid = LEAST(amount, amount_paid + p_amount),
    status = CASE 
      WHEN (amount_paid + p_amount) >= amount THEN 'Paid in full'
      WHEN (amount_paid + p_amount) > 0 THEN 'Partially Paid'
      ELSE status
    END,
    paid_date = CASE 
      WHEN (amount_paid + p_amount) >= amount THEN v_today
      ELSE paid_date
    END,
    updated_at = NOW()
  WHERE invoice_id = p_invoice_id
    AND status <> 'Cancelled';

  -- 15. Touch client record
  UPDATE public.clients
  SET updated_at = NOW()
  WHERE id = v_payment.client_id;

  RETURN jsonb_build_object(
    'success', true,
    'allocation_id', v_allocation_id,
    'allocated_amount', p_amount,
    'invoice_paid', v_new_invoice_paid,
    'invoice_balance', v_new_invoice_balance,
    'invoice_status', v_new_invoice_status,
    'invoice_item_id', v_resolved_item_id,
    'client_service_id', v_resolved_service_id
  );
END;
$$;

