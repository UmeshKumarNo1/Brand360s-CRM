-- ==============================================================================
-- BRAND 360s CRM — Migration 017: Comprehensive Renewals Table & Audit Trail
-- ==============================================================================

-- 1. Create dedicated renewals table for multi-cycle history tracking
CREATE TABLE IF NOT EXISTS public.renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  client_service_id UUID NOT NULL REFERENCES public.client_services(id) ON DELETE CASCADE,
  salesperson_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  service_name_snapshot TEXT NOT NULL,
  previous_expiry_date DATE,
  renewal_start_date DATE NOT NULL,
  renewal_end_date DATE NOT NULL,
  renewal_date DATE NOT NULL,
  renewal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  payment_status TEXT NOT NULL DEFAULT 'Unpaid' CHECK (payment_status IN ('Unpaid', 'Partially Paid', 'Paid')),
  renewal_status TEXT NOT NULL DEFAULT 'Pending' CHECK (renewal_status IN ('Pending', 'Renewed', 'Cancelled')),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_renewals_client_id ON public.renewals(client_id);
CREATE INDEX IF NOT EXISTS idx_renewals_client_service_id ON public.renewals(client_service_id);
CREATE INDEX IF NOT EXISTS idx_renewals_salesperson_id ON public.renewals(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_renewals_renewal_date ON public.renewals(renewal_date);
CREATE INDEX IF NOT EXISTS idx_renewals_renewal_status ON public.renewals(renewal_status);
CREATE INDEX IF NOT EXISTS idx_renewals_invoice_id ON public.renewals(invoice_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.renewals ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Admin Policy: Admins can view, insert, update, and manage all renewals
CREATE POLICY "Admins full access on renewals"
  ON public.renewals
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Salesperson Policy: Salespersons can view renewals for clients assigned to them
CREATE POLICY "Salespersons view assigned client renewals"
  ON public.renewals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = renewals.client_id
        AND clients.assigned_salesperson = auth.uid()
    )
  );

-- Salespersons can create renewals for clients assigned to them
CREATE POLICY "Salespersons insert assigned client renewals"
  ON public.renewals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = renewals.client_id
        AND clients.assigned_salesperson = auth.uid()
    )
  );

-- Salespersons can update renewals for clients assigned to them
CREATE POLICY "Salespersons update assigned client renewals"
  ON public.renewals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = renewals.client_id
        AND clients.assigned_salesperson = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = renewals.client_id
        AND clients.assigned_salesperson = auth.uid()
    )
  );

-- 5. Reload Schema cache
NOTIFY pgrst, 'reload schema';

