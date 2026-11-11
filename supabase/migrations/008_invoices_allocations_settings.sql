-- ==============================================================================
-- BRAND 360s CRM — Migration 008: Invoice Enhancements, Payment Allocations & Settings
-- ==============================================================================

-- 1. Extend invoices table with advance billing, tax breakdown & terms
ALTER TABLE public.invoices 
  ADD COLUMN IF NOT EXISTS billing_type TEXT DEFAULT 'Full Payment',
  ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Due on Receipt',
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS tax_type TEXT DEFAULT 'CGST + SGST', -- 'CGST + SGST', 'IGST', 'No tax'
  ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS terms TEXT,
  ADD COLUMN IF NOT EXISTS billing_snapshot JSONB;

-- 2. Extend invoice_items table with client_service link and discount
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS client_service_id UUID REFERENCES public.client_services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) DEFAULT 18.00;

-- 3. Create invoice_payment_allocations table
CREATE TABLE IF NOT EXISTS public.invoice_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  allocated_amount NUMERIC(12, 2) NOT NULL CHECK (allocated_amount > 0),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_allocations_invoice ON public.invoice_payment_allocations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_allocations_payment ON public.invoice_payment_allocations(payment_id);

-- 4. Create crm_settings table (singleton key-value or single row for enterprise billing details)
CREATE TABLE IF NOT EXISTS public.crm_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  company_name TEXT NOT NULL DEFAULT 'BRAND 360s',
  company_address TEXT DEFAULT '1531/A Anna Nagar, Thondi Road, Sivaganga, Tamil Nadu 630561',
  gstin TEXT DEFAULT '33AAAAA0000A1Z5',
  pan TEXT DEFAULT 'ABCDE1234F',
  cin TEXT DEFAULT 'U74999TN2025PTC123456',
  company_logo TEXT,
  invoice_prefix TEXT DEFAULT 'B360-INV-',
  default_gst_rate NUMERIC(5, 2) DEFAULT 18.00,
  default_payment_terms TEXT DEFAULT 'Due on Receipt',
  bank_name TEXT DEFAULT 'HDFC Bank',
  account_number TEXT DEFAULT '50200088991122',
  ifsc TEXT DEFAULT 'HDFC0001234',
  account_holder_name TEXT DEFAULT 'BRAND 360S PRIVATE LIMITED',
  upi_id TEXT DEFAULT 'brand360s@hdfcbank',
  payment_instructions TEXT DEFAULT 'Please include invoice number in the payment description / UTR reference.',
  terms_conditions TEXT DEFAULT '1. Goods / Services once confirmed are non-refundable. 2. Payments must be cleared by the due date. 3. Disputes are subject to Sivaganga / Chennai jurisdiction.',
  authorized_signatory TEXT DEFAULT 'Managing Director',
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Seed default settings row if not exists
INSERT INTO public.crm_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- 5. Row Level Security for Allocations & Settings
ALTER TABLE public.invoice_payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;

-- Allocations Policies
CREATE POLICY "Admins full access on allocations"
ON public.invoice_payment_allocations FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Employees view relevant allocations"
ON public.invoice_payment_allocations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices 
    JOIN public.clients ON clients.id = invoices.client_id
    WHERE invoices.id = invoice_payment_allocations.invoice_id
    AND (clients.assigned_salesperson = auth.uid() OR clients.created_by = auth.uid() OR public.is_admin())
  )
);

-- CRM Settings Policies: Readable by all authenticated, manageable by Admin
CREATE POLICY "CRM Settings readable by authenticated"
ON public.crm_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage CRM settings"
ON public.crm_settings FOR ALL TO authenticated USING (public.is_admin());

