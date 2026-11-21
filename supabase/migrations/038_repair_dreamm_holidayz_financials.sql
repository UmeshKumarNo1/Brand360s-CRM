-- Migration: 038_repair_dreamm_holidayz_financials.sql
-- Description: Safe Data Repair for Dreamm Holidayz:
-- 1. Updates client_service (1893fc1c-6413-488f-96e9-ad375ee1b2c9) to service_fee = 50000, total_amount = 50000.
-- 2. Links orphaned invoice_item (fd8d2cb5-6a30-4e1e-8ec8-fa643acc127e) of invoice B360-INV-2026-0005 to client_service 1893fc1c-6413-488f-96e9-ad375ee1b2c9.
-- 3. Synchronizes client contract_value and balance_receivable to 50000 and 25000 respectively.
-- 4. Records the correction in the audit trail.

BEGIN;

-- 1. Verify and update service commercial fees
UPDATE public.client_services
SET 
  service_fee = 50000.00,
  govt_fee = 0.00,
  additional_fee = 0.00,
  discount = 0.00,
  total_amount = 50000.00,
  updated_at = TIMEZONE('utc', NOW())
WHERE id = '1893fc1c-6413-488f-96e9-ad375ee1b2c9'
  AND client_id = '4ff6f172-db1d-467b-8c32-1bcada266c39';

-- 2. Link orphaned invoice item to this confirmed service
UPDATE public.invoice_items
SET 
  client_service_id = '1893fc1c-6413-488f-96e9-ad375ee1b2c9'
WHERE id = 'fd8d2cb5-6a30-4e1e-8ec8-fa643acc127e'
  AND invoice_id = '46967bbd-fdd7-42fc-8573-8629f9001025'
  AND client_service_id IS NULL;

-- 3. Synchronize client summary fields
UPDATE public.clients
SET 
  contract_value = 50000.00,
  payments_received = 25000.00,
  balance_receivable = 25000.00,
  payment_status = 'Partially Paid',
  updated_at = TIMEZONE('utc', NOW())
WHERE id = '4ff6f172-db1d-467b-8c32-1bcada266c39';

-- 4. Record in audit trail (if audit_logs table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, entity_name, details, created_at)
    VALUES (
      'REPAIR',
      'client_financials',
      '4ff6f172-db1d-467b-8c32-1bcada266c39',
      'Dreamm Holidayz',
      jsonb_build_object(
        'reason', 'Financial reconciliation repair for Dreamm Holidayz',
        'previousServiceFee', 0,
        'newServiceFee', 50000,
        'repairedInvoiceItemId', 'fd8d2cb5-6a30-4e1e-8ec8-fa643acc127e',
        'invoiceNumber', 'B360-INV-2026-0005'
      ),
      TIMEZONE('utc', NOW())
    );
  END IF;
END $$;

COMMIT;
