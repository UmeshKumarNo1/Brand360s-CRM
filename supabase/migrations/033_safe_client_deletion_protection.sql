-- Migration 033: Safe Client Deletion & Invoice Protection Function
-- Implements safe deletion rules, draft invoice cleanup, issued invoice protection,
-- and atomic client deletion/cleanup in Supabase.

CREATE OR REPLACE FUNCTION public.safe_delete_or_archive_client(
  p_client_id UUID,
  p_action TEXT -- 'DELETE' or 'ARCHIVE'
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
  v_draft_invoices_count INT := 0;
  v_issued_invoices_count INT := 0;
  v_payments_count INT := 0;
  v_allocations_count INT := 0;
  v_services_count INT := 0;
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
    RETURN jsonb_build_object('success', false, 'error', 'Only authorized administrators can delete or archive client accounts.');
  END IF;

  -- 3. Lock and fetch client
  SELECT * INTO v_client
  FROM public.clients
  WHERE id = p_client_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Client not found.');
  END IF;

  -- 4. Audit financial dependencies
  SELECT COUNT(*) INTO v_draft_invoices_count
  FROM public.invoices
  WHERE client_id = p_client_id AND status = 'Draft';

  SELECT COUNT(*) INTO v_issued_invoices_count
  FROM public.invoices
  WHERE client_id = p_client_id AND status <> 'Draft';

  SELECT COUNT(*) INTO v_payments_count
  FROM public.payments
  WHERE client_id = p_client_id;

  SELECT COUNT(*) INTO v_allocations_count
  FROM public.invoice_payment_allocations ipa
  JOIN public.invoices inv ON inv.id = ipa.invoice_id
  WHERE inv.client_id = p_client_id;

  SELECT COUNT(*) INTO v_services_count
  FROM public.client_services
  WHERE client_id = p_client_id;

  -- 5. Handle ARCHIVE action
  IF p_action = 'ARCHIVE' THEN
    UPDATE public.clients
    SET
      client_status = 'Archived',
      archived_at = NOW(),
      archived_by = v_user_id,
      archive_reason = 'Archived by Administrator',
      updated_at = NOW()
    WHERE id = p_client_id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'ARCHIVE',
      'message', 'Client successfully archived. All financial records and audit history preserved.'
    );
  END IF;

  -- 6. Handle DELETE action
  IF p_action = 'DELETE' THEN
    -- Rule E: Any payments or payment allocations -> Block permanent deletion
    IF v_payments_count > 0 OR v_allocations_count > 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'canDelete', false,
        'requiresArchive', true,
        'error', 'Financial records exist: Client has recorded payments or payment allocations. To preserve tax and statutory audit records, permanent deletion is prevented. Please archive the client.'
      );
    END IF;

    -- Rule D: Issued invoices exist without payments -> Block silent deletion, require archive/void
    IF v_issued_invoices_count > 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'canDelete', false,
        'requiresArchive', true,
        'issuedInvoicesCount', v_issued_invoices_count,
        'error', 'Issued invoices exist: Client has issued or official invoices. These cannot be deleted to preserve numbering and tax history. Please archive the client instead.'
      );
    END IF;

    -- Rule C: Only draft invoices exist (no payments) -> Safely clean up draft invoices and items
    IF v_draft_invoices_count > 0 THEN
      DELETE FROM public.invoice_items
      WHERE invoice_id IN (
        SELECT id FROM public.invoices WHERE client_id = p_client_id AND status = 'Draft'
      );

      DELETE FROM public.invoices
      WHERE client_id = p_client_id AND status = 'Draft';
    END IF;

    -- Rule B & A: Clean up dependent client services, service stages, documents, schedules, followups
    DELETE FROM public.service_stage_history WHERE client_id = p_client_id;
    DELETE FROM public.documents WHERE client_id = p_client_id;
    DELETE FROM public.payment_schedules WHERE client_id = p_client_id;
    DELETE FROM public.follow_ups WHERE client_id = p_client_id;
    DELETE FROM public.client_services WHERE client_id = p_client_id;

    -- Finally, delete client record
    DELETE FROM public.clients WHERE id = p_client_id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'DELETE',
      'message', 'Client and eligible non-financial dependent records permanently deleted.'
    );
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'Invalid action specified.');
END;
$$;

