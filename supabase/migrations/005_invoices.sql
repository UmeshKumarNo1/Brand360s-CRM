-- ==============================================================================
-- BRAND 360s CRM — Migration 005: Invoices, Invoice Items & PDF Metadata
-- ==============================================================================

-- 1. Invoice Number Sequence (e.g. INV-2025-1001)
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START WITH 1001;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || nextval('public.invoice_number_seq')::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'Issued' CHECK (status IN ('Draft', 'Issued', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled')),
  pdf_url TEXT,
  email_sent_to TEXT,
  email_sent_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Trigger for invoice number
DROP TRIGGER IF EXISTS trg_generate_invoice_number ON public.invoices;
CREATE TRIGGER trg_generate_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_invoice_number();

CREATE INDEX IF NOT EXISTS idx_invoices_client ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- 3. Invoice Items Table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

CREATE INDEX IF NOT EXISTS idx_invoice_items ON public.invoice_items(invoice_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

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

-- INVOICES RLS:
-- Admin full access
DROP POLICY IF EXISTS "Admins full access on invoices" ON public.invoices;
CREATE POLICY "Admins full access on invoices"
ON public.invoices FOR ALL TO authenticated
USING (public.is_admin());

-- Employees can view invoices of their own clients
DROP POLICY IF EXISTS "Employees view own client invoices" ON public.invoices;
CREATE POLICY "Employees view own client invoices"
ON public.invoices FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = invoices.client_id 
    AND (clients.assigned_salesperson = auth.uid() OR clients.created_by = auth.uid())
  )
);

-- Employees can create invoices for their own clients
DROP POLICY IF EXISTS "Employees insert own client invoices" ON public.invoices;
CREATE POLICY "Employees insert own client invoices"
ON public.invoices FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = invoices.client_id 
    AND (clients.assigned_salesperson = auth.uid() OR clients.created_by = auth.uid())
  )
);

-- INVOICE ITEMS RLS:
DROP POLICY IF EXISTS "Admins full access on invoice items" ON public.invoice_items;
CREATE POLICY "Admins full access on invoice items"
ON public.invoice_items FOR ALL TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Employees view and insert own client invoice items" ON public.invoice_items;
CREATE POLICY "Employees view and insert own client invoice items"
ON public.invoice_items FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices 
    JOIN public.clients ON clients.id = invoices.client_id
    WHERE invoices.id = invoice_items.invoice_id 
    AND (clients.assigned_salesperson = auth.uid() OR clients.created_by = auth.uid())
  )
);

