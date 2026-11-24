-- ==============================================================================
-- BRAND 360s CRM — Migration 045: Explicit Renewal Invoice Linking & Status Separation
-- ==============================================================================

-- 1. Add renewal_id reference to invoices table to unambiguously identify invoices
-- that belong to a specific renewal cycle, separating them from original service assignment invoices.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS renewal_id UUID REFERENCES public.renewals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_renewal_id ON public.invoices(renewal_id);

-- 2. Extend invoice_status and payment_status constraints if needed
-- Ensures renewals table invoice_id has index
CREATE INDEX IF NOT EXISTS idx_renewals_invoice_id ON public.renewals(invoice_id);

-- 3. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
