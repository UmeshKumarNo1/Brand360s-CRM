-- ==============================================================================
-- BRAND 360s CRM — Migration 004: Payments & Payment Installments Schema & RLS
-- ==============================================================================

-- 1. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Bank Transfer / NEFT', 'UPI / QR', 'Credit Card', 'Debit Card', 'Cheque', 'Cash', 'Other')),
  transaction_ref TEXT,
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'Verified' CHECK (status IN ('Pending Verification', 'Verified', 'Rejected', 'Refunded')),
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_client ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- 2. Payment Schedules (Installments) Table
CREATE TABLE IF NOT EXISTS public.payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Installment',
  installment_number INTEGER NOT NULL DEFAULT 1,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Partially Paid', 'Paid in full', 'Overdue', 'Cancelled')),
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_schedules_client ON public.payment_schedules(client_id);
CREATE INDEX IF NOT EXISTS idx_schedules_due_date ON public.payment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON public.payment_schedules(status);

-- 3. Trigger / Function to Synchronize Client Totals Automatically
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

  -- 1. Sum verified payments
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

-- Trigger on payments insert/update/delete
DROP TRIGGER IF EXISTS trg_sync_financials_on_payment ON public.payments;
CREATE TRIGGER trg_sync_financials_on_payment
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_client_financials();

-- Trigger on payment_schedules insert/update/delete
DROP TRIGGER IF EXISTS trg_sync_financials_on_schedule ON public.payment_schedules;
CREATE TRIGGER trg_sync_financials_on_schedule
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_client_financials();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;

-- Helper to verify admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PAYMENTS POLICIES:
-- Admin full access
DROP POLICY IF EXISTS "Admins full access on payments" ON public.payments;
CREATE POLICY "Admins full access on payments"
ON public.payments FOR ALL TO authenticated
USING (public.is_admin());

-- Employee can view payments of own assigned clients
DROP POLICY IF EXISTS "Employees view own client payments" ON public.payments;
CREATE POLICY "Employees view own client payments"
ON public.payments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = payments.client_id 
    AND (clients.assigned_salesperson = auth.uid() OR clients.created_by = auth.uid())
  )
);

-- Employee can insert payments for own assigned clients
DROP POLICY IF EXISTS "Employees insert own client payments" ON public.payments;
CREATE POLICY "Employees insert own client payments"
ON public.payments FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = payments.client_id 
    AND (clients.assigned_salesperson = auth.uid() OR clients.created_by = auth.uid())
  )
);

-- PAYMENT SCHEDULES POLICIES:
DROP POLICY IF EXISTS "Admins full access on schedules" ON public.payment_schedules;
CREATE POLICY "Admins full access on schedules"
ON public.payment_schedules FOR ALL TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Employees manage own client schedules" ON public.payment_schedules;
CREATE POLICY "Employees manage own client schedules"
ON public.payment_schedules FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = payment_schedules.client_id 
    AND (clients.assigned_salesperson = auth.uid() OR clients.created_by = auth.uid())
  )
);

