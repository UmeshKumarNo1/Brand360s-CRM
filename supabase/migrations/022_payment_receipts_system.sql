-- ==============================================================================
-- BRAND 360s CRM — Migration 022: Payment Receipts & Number Sequence System
-- ==============================================================================

-- 1. Create sequential receipt number generator function & sequence
CREATE SEQUENCE IF NOT EXISTS public.payment_receipt_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_year TEXT;
  v_next_val BIGINT;
  v_rec_num TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  v_next_val := nextval('public.payment_receipt_seq');
  v_rec_num := 'REC-' || v_year || '-' || LPAD(v_next_val::TEXT, 4, '0');
  RETURN v_rec_num;
END;
$$;

-- 2. Create payment_receipts table
CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT UNIQUE NOT NULL,
  payment_id UUID UNIQUE NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  installment_id UUID REFERENCES public.payment_schedules(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  amount_received NUMERIC(12, 2) NOT NULL CHECK (amount_received > 0),
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL,
  transaction_reference TEXT,
  pdf_storage_path TEXT,
  notes TEXT,
  generated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  generated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 3. Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_receipts_client ON public.payment_receipts(client_id);
CREATE INDEX IF NOT EXISTS idx_receipts_payment ON public.payment_receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_installment ON public.payment_receipts(installment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_invoice ON public.payment_receipts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_receipts_number ON public.payment_receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON public.payment_receipts(payment_date DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Admins have full access to view, insert, update payment receipts
DROP POLICY IF EXISTS "Admins full access on payment receipts" ON public.payment_receipts;
CREATE POLICY "Admins full access on payment receipts"
ON public.payment_receipts
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Salespersons can view receipts for clients assigned to them or created by them
DROP POLICY IF EXISTS "Employees view assigned client receipts" ON public.payment_receipts;
CREATE POLICY "Employees view assigned client receipts"
ON public.payment_receipts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = payment_receipts.client_id
    AND (clients.assigned_salesperson = auth.uid() OR clients.created_by = auth.uid() OR public.is_admin())
  )
);

-- Authenticated staff can insert receipts for assigned clients or as admin
DROP POLICY IF EXISTS "Staff insert assigned client receipts" ON public.payment_receipts;
CREATE POLICY "Staff insert assigned client receipts"
ON public.payment_receipts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = payment_receipts.client_id
    AND (clients.assigned_salesperson = auth.uid() OR clients.created_by = auth.uid() OR public.is_admin())
  )
);

-- 6. Helper RPC to generate or retrieve receipt for a payment idempotently
CREATE OR REPLACE FUNCTION public.create_or_get_payment_receipt(
  p_payment_id UUID,
  p_installment_id UUID DEFAULT NULL,
  p_invoice_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_payment RECORD;
  v_receipt RECORD;
  v_inv_id UUID;
  v_inst_id UUID;
  v_receipt_number TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment record not found.');
  END IF;

  -- Verify permissions: admin or assigned salesperson
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_user_id AND role = 'admin' AND is_active = true
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = v_payment.client_id
      AND (assigned_salesperson = v_user_id OR created_by = v_user_id)
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized to generate receipt for this client.');
    END IF;
  END IF;

  -- Check if receipt already exists
  SELECT * INTO v_receipt FROM public.payment_receipts WHERE payment_id = p_payment_id;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'is_new', false,
      'receipt_id', v_receipt.id,
      'receipt_number', v_receipt.receipt_number
    );
  END IF;

  -- Determine invoice_id if not passed
  v_inv_id := p_invoice_id;
  IF v_inv_id IS NULL THEN
    SELECT invoice_id INTO v_inv_id
    FROM public.invoice_payment_allocations
    WHERE payment_id = p_payment_id
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- Determine installment_id if not passed
  v_inst_id := p_installment_id;
  IF v_inst_id IS NULL THEN
    SELECT installment_id INTO v_inst_id
    FROM public.installment_payment_allocations
    WHERE payment_id = p_payment_id
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- Generate sequential number
  v_receipt_number := public.generate_receipt_number();

  -- Insert record atomically
  INSERT INTO public.payment_receipts (
    receipt_number,
    payment_id,
    client_id,
    installment_id,
    invoice_id,
    amount_received,
    payment_date,
    payment_method,
    transaction_reference,
    notes,
    generated_at,
    generated_by
  ) VALUES (
    v_receipt_number,
    v_payment.id,
    v_payment.client_id,
    v_inst_id,
    v_inv_id,
    v_payment.amount,
    v_payment.payment_date,
    v_payment.payment_method,
    v_payment.transaction_ref,
    v_payment.notes,
    NOW(),
    v_user_id
  )
  RETURNING * INTO v_receipt;

  RETURN jsonb_build_object(
    'success', true,
    'is_new', true,
    'receipt_id', v_receipt.id,
    'receipt_number', v_receipt.receipt_number
  );
END;
$$;

