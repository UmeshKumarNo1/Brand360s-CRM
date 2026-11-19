-- Migration 034: Service-Level Safe Deletion & Dependency Check RPC
-- Supports independent deletion of services without financial commitments (Cases A & B),
-- strictly blocks deletion of services with issued invoices or recorded payments/allocations (Cases C & D),
-- and recalculates client contract value, services_purchased string, and status.

CREATE OR REPLACE FUNCTION public.check_service_deletion_eligibility(
  p_service_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_service RECORD;
  v_draft_invoices_count INT := 0;
  v_issued_invoices_count INT := 0;
  v_allocations_count INT := 0;
  v_allocated_total NUMERIC(12, 2) := 0;
  v_can_delete BOOLEAN := false;
  v_rule_category TEXT := 'NO_FINANCIALS';
  v_reason TEXT := '';
BEGIN
  -- 1. Fetch service
  SELECT * INTO v_service
  FROM public.client_services
  WHERE id = p_service_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Service record not found.'
    );
  END IF;

  -- 2. Check payment allocations explicitly linked to this service
  SELECT 
    COUNT(*), 
    COALESCE(SUM(allocated_amount), 0)
  INTO 
    v_allocations_count, 
    v_allocated_total
  FROM public.invoice_payment_allocations
  WHERE client_service_id = p_service_id;

  -- 3. Check invoice items linked to this service
  -- Issued invoices
  SELECT COUNT(DISTINCT inv.id) INTO v_issued_invoices_count
  FROM public.invoice_items ii
  JOIN public.invoices inv ON inv.id = ii.invoice_id
  WHERE ii.client_service_id = p_service_id
    AND inv.status <> 'Draft'
    AND inv.status <> 'Cancelled';

  -- Draft invoices
  SELECT COUNT(DISTINCT inv.id) INTO v_draft_invoices_count
  FROM public.invoice_items ii
  JOIN public.invoices inv ON inv.id = ii.invoice_id
  WHERE ii.client_service_id = p_service_id
    AND inv.status = 'Draft';

  -- Also check if an invoice has allocations via invoice_id
  IF v_allocations_count = 0 THEN
    SELECT COUNT(*), COALESCE(SUM(ipa.allocated_amount), 0)
    INTO v_allocations_count, v_allocated_total
    FROM public.invoice_payment_allocations ipa
    JOIN public.invoice_items ii ON ii.invoice_id = ipa.invoice_id
    WHERE ii.client_service_id = p_service_id;
  END IF;

  -- 4. Evaluate Cases A, B, C, D
  -- Case D: Recorded payments / allocations exist
  IF v_allocations_count > 0 OR v_allocated_total > 0 THEN
    v_can_delete := false;
    v_rule_category := 'PAYMENTS_OR_ALLOCS';
    v_reason := 'This service has recorded payment allocations (₹' || TO_CHAR(v_allocated_total, 'FM999,999,990.00') || '). Permanent deletion is blocked to preserve statutory financial receipts and GST audit compliance.';

  -- Case C: Issued invoice exists
  ELSIF v_issued_invoices_count > 0 THEN
    v_can_delete := false;
    v_rule_category := 'ISSUED_INVOICE';
    v_reason := 'This service is linked to ' || v_issued_invoices_count || ' issued tax invoice(s). Permanent deletion is blocked to maintain sequential invoice numbering and tax records.';

  -- Case B: Draft invoice only (no payments)
  ELSIF v_draft_invoices_count > 0 THEN
    v_can_delete := true;
    v_rule_category := 'DRAFT_ONLY';
    v_reason := 'This service has ' || v_draft_invoices_count || ' unissued draft invoice(s) with zero payments. Deleting this service will safely purge its draft items and unissued draft invoice.';

  -- Case A: No invoice or payment
  ELSE
    v_can_delete := true;
    v_rule_category := 'NO_FINANCIALS';
    v_reason := 'This service has no invoices or payments. It can be safely and permanently deleted without affecting other client services.';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'serviceId', p_service_id,
    'serviceName', v_service.service_name,
    'clientId', v_service.client_id,
    'canDelete', v_can_delete,
    'ruleCategory', v_rule_category,
    'reason', v_reason,
    'draftInvoicesCount', v_draft_invoices_count,
    'issuedInvoicesCount', v_issued_invoices_count,
    'allocationsCount', v_allocations_count,
    'allocatedTotal', v_allocated_total
  );
END;
$$;


CREATE OR REPLACE FUNCTION public.safe_delete_client_service(
  p_service_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN := false;
  v_service RECORD;
  v_client_id UUID;
  v_service_name TEXT;
  v_eligibility JSONB;
  v_draft_invoice_ids UUID[];
  v_remaining_services_count INT := 0;
  v_remaining_services_str TEXT := '';
  v_new_contract_value NUMERIC(12, 2) := 0;
  v_total_verified_payments NUMERIC(12, 2) := 0;
  v_new_balance_receivable NUMERIC(12, 2) := 0;
BEGIN
  -- 1. Check authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  -- 2. Verify admin role
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND role = 'admin' AND is_active = true
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only authorized administrators can delete services.');
  END IF;

  -- 3. Lock service record
  SELECT * INTO v_service
  FROM public.client_services
  WHERE id = p_service_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service record not found.');
  END IF;

  v_client_id := v_service.client_id;
  v_service_name := v_service.service_name;

  -- 4. Check eligibility
  v_eligibility := public.check_service_deletion_eligibility(p_service_id);

  IF NOT (v_eligibility->>'canDelete')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', v_eligibility->>'reason',
      'ruleCategory', v_eligibility->>'ruleCategory'
    );
  END IF;

  -- 5. Case B handling: Clean up draft invoice items and draft invoices
  IF (v_eligibility->>'ruleCategory') = 'DRAFT_ONLY' THEN
    -- Find draft invoices where this service is an item
    SELECT ARRAY_AGG(DISTINCT inv.id) INTO v_draft_invoice_ids
    FROM public.invoice_items ii
    JOIN public.invoices inv ON inv.id = ii.invoice_id
    WHERE ii.client_service_id = p_service_id AND inv.status = 'Draft';

    IF v_draft_invoice_ids IS NOT NULL AND ARRAY_LENGTH(v_draft_invoice_ids, 1) > 0 THEN
      -- Delete item lines for this service
      DELETE FROM public.invoice_items
      WHERE client_service_id = p_service_id;

      -- Delete draft invoices that now have no items left
      DELETE FROM public.invoices inv
      WHERE inv.id = ANY(v_draft_invoice_ids)
        AND inv.status = 'Draft'
        AND NOT EXISTS (
          SELECT 1 FROM public.invoice_items sub_ii WHERE sub_ii.invoice_id = inv.id
        );
    END IF;
  END IF;

  -- 6. Clean up service-dependent non-financial records
  -- Service fulfillment stage history
  DELETE FROM public.service_stage_history
  WHERE client_service_id = p_service_id;

  -- Service-level uploaded documents (non-invoices)
  DELETE FROM public.documents
  WHERE client_service_id = p_service_id;

  -- Service vendor assignments
  DELETE FROM public.service_vendors
  WHERE client_service_id = p_service_id;

  -- Service renewals
  DELETE FROM public.renewals
  WHERE client_service_id = p_service_id;

  -- 7. Permanently delete the client_service record
  DELETE FROM public.client_services
  WHERE id = p_service_id;

  -- 8. Recalculate client contract values, remaining services, and services_purchased summary
  SELECT 
    COUNT(*),
    COALESCE(STRING_AGG(DISTINCT service_name, ', '), ''),
    COALESCE(SUM(COALESCE(total_amount, (service_fee + govt_fee), 0)), 0)
  INTO 
    v_remaining_services_count,
    v_remaining_services_str,
    v_new_contract_value
  FROM public.client_services
  WHERE client_id = v_client_id
    AND service_status <> 'Cancelled';

  -- Verified payments for client
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_verified_payments
  FROM public.payments
  WHERE client_id = v_client_id AND status = 'Verified';

  v_new_balance_receivable := GREATEST(0, v_new_contract_value - v_total_verified_payments);

  -- Update client record
  UPDATE public.clients
  SET 
    services_purchased = CASE 
      WHEN v_remaining_services_count > 0 THEN v_remaining_services_str 
      ELSE NULL 
    END,
    contract_value = v_new_contract_value,
    balance_receivable = v_new_balance_receivable,
    updated_at = NOW()
  WHERE id = v_client_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Service "' || v_service_name || '" successfully deleted.',
    'clientId', v_client_id,
    'remainingServicesCount', v_remaining_services_count,
    'newContractValue', v_new_contract_value,
    'newBalanceReceivable', v_new_balance_receivable
  );
END;
$$;

